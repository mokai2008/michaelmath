#!/usr/bin/env node

/**
 * Migration Script: Organize /public/uploads into course folders (/uploads/<course_name>/<filename>)
 * Updates both the local/VPS filesystem and Supabase database records.
 *
 * Usage:
 *   node scripts/migrate-uploads.mjs
 *   node scripts/migrate-uploads.mjs "Course Name"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to sanitize course folder name (matches lib/uploads.ts)
function sanitizeCourseFolder(name) {
  if (!name || typeof name !== 'string') return 'general';
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'general';
}

function isRootUpload(url) {
  if (!url || typeof url !== 'string') return false;
  return Boolean(url.trim().match(/(?:^|https?:\/\/[^\/]+)\/uploads\/([^\/]+)$/));
}

function toCourseUrl(url, courseName) {
  if (!url || typeof url !== 'string' || !courseName) return url;
  const folder = sanitizeCourseFolder(courseName);
  const trimmed = url.trim();
  let pathname = trimmed;
  let origin = '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      origin = parsed.origin;
      pathname = parsed.pathname;
    } catch {
      return url;
    }
  }
  if (!pathname.startsWith('/uploads/')) return url;
  const rel = pathname.replace(/^\/uploads\/?/, '');
  if (rel.includes('/')) return url; // Already in a subfolder
  const newPath = `/uploads/${folder}/${rel}`;
  return origin ? `${origin}${newPath}` : newPath;
}

// Locate uploads directory
let uploadsDir = path.resolve(rootDir, 'public', 'uploads');
if (!fs.existsSync(uploadsDir) && fs.existsSync('/home/gadmaths/htdocs/public/uploads')) {
  uploadsDir = '/home/gadmaths/htdocs/public/uploads';
}

console.log('================================================================');
console.log('📦 LMS Uploads Migration: Organize by Course Folder');
console.log(`📂 Uploads directory: ${uploadsDir}`);
console.log('================================================================');

if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Parse .env.local for Supabase connection if available
let env = {};
const envPath = path.resolve(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["\']|["\']$/g, '');
  });
}

async function run() {
  const cliCourseArg = process.argv[2];
  let supabase = null;

  if (env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      console.log(' Connected to Supabase!');
    } catch (err) {
      console.log('⚠️ Could not load Supabase client:', err.message);
    }
  }

  let courses = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from('courses').select('id, title, intro_video_url, thumbnail_url');
      if (!error && Array.isArray(data) && data.length > 0) {
        courses = data;
        console.log(`📋 Found ${courses.length} courses in database.`);
      }
    } catch (e) {
      console.log('Note: RLS active on courses table for script query.');
    }
  }

  // 1. Check loose files in root uploads directory
  const rootEntries = fs.readdirSync(uploadsDir, { withFileTypes: true });
  const looseFiles = rootEntries
    .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name !== '.gitkeep')
    .map((e) => e.name);

  console.log(`📁 Loose files sitting in root /uploads/: ${looseFiles.length}`);

  // Determine target course folder for filesystem migration
  let defaultCourseFolder = null;
  if (cliCourseArg) {
    defaultCourseFolder = sanitizeCourseFolder(cliCourseArg);
  } else if (courses.length === 1 && courses[0].title) {
    defaultCourseFolder = sanitizeCourseFolder(courses[0].title);
  }

  // 2. If courses are loaded from DB, migrate each course's records & files
  for (const course of courses) {
    const folder = sanitizeCourseFolder(course.title);
    const targetDir = path.resolve(uploadsDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`\n📚 Processing Course: "${course.title}" -> /uploads/${folder}/`);

    // Migrate course intro video & thumbnail
    let courseUpdates = {};
    if (course.intro_video_url && isRootUpload(course.intro_video_url)) {
      const filename = path.basename(course.intro_video_url);
      const oldPath = path.resolve(uploadsDir, filename);
      const newPath = path.resolve(targetDir, filename);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`  ✓ Moved intro video: ${filename} -> ${folder}/${filename}`);
      }
      courseUpdates.intro_video_url = toCourseUrl(course.intro_video_url, course.title);
    }

    if (course.thumbnail_url && isRootUpload(course.thumbnail_url)) {
      const filename = path.basename(course.thumbnail_url);
      const oldPath = path.resolve(uploadsDir, filename);
      const newPath = path.resolve(targetDir, filename);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`  ✓ Moved thumbnail: ${filename} -> ${folder}/${filename}`);
      }
      courseUpdates.thumbnail_url = toCourseUrl(course.thumbnail_url, course.title);
    }

    if (Object.keys(courseUpdates).length > 0 && supabase) {
      await supabase.from('courses').update(courseUpdates).eq('id', course.id);
      console.log(`  ✓ Updated courses record in DB.`);
    }

    // Migrate topics in this course
    try {
      const { data: sections } = await supabase.from('sections').select('id').eq('course_id', course.id);
      const sectionIds = (sections || []).map((s) => s.id);
      if (sectionIds.length > 0) {
        const { data: topics } = await supabase.from('topics').select('*').in('section_id', sectionIds);
        for (const topic of topics || []) {
          let topicUpdates = {};
          let topicModified = false;

          // Migrate topic.youtube_url
          if (topic.youtube_url && isRootUpload(topic.youtube_url)) {
            const filename = path.basename(topic.youtube_url);
            const oldPath = path.resolve(uploadsDir, filename);
            const newPath = path.resolve(targetDir, filename);
            if (fs.existsSync(oldPath)) {
              fs.renameSync(oldPath, newPath);
              console.log(`  ✓ Moved topic video: ${filename} -> ${folder}/${filename}`);
            }
            topicUpdates.youtube_url = toCourseUrl(topic.youtube_url, course.title);
            topicModified = true;
          }

          // Migrate topic.content_items
          if (Array.isArray(topic.content_items)) {
            let itemsModified = false;
            const updatedItems = topic.content_items.map((item) => {
              let nextItem = { ...item };
              if (nextItem.url && isRootUpload(nextItem.url)) {
                const filename = path.basename(nextItem.url);
                const oldPath = path.resolve(uploadsDir, filename);
                const newPath = path.resolve(targetDir, filename);
                if (fs.existsSync(oldPath)) {
                  fs.renameSync(oldPath, newPath);
                  console.log(`  ✓ Moved item file: ${filename} -> ${folder}/${filename}`);
                }
                nextItem.url = toCourseUrl(nextItem.url, course.title);
                itemsModified = true;
              }
              if (Array.isArray(nextItem.urls)) {
                nextItem.urls = nextItem.urls.map((u) => {
                  if (isRootUpload(u)) {
                    const filename = path.basename(u);
                    const oldPath = path.resolve(uploadsDir, filename);
                    const newPath = path.resolve(targetDir, filename);
                    if (fs.existsSync(oldPath)) {
                      fs.renameSync(oldPath, newPath);
                      console.log(`  ✓ Moved mirror file: ${filename} -> ${folder}/${filename}`);
                    }
                    itemsModified = true;
                    return toCourseUrl(u, course.title);
                  }
                  return u;
                });
              }
              if (nextItem.worksheetPdfUrl && isRootUpload(nextItem.worksheetPdfUrl)) {
                const filename = path.basename(nextItem.worksheetPdfUrl);
                const oldPath = path.resolve(uploadsDir, filename);
                const newPath = path.resolve(targetDir, filename);
                if (fs.existsSync(oldPath)) {
                  fs.renameSync(oldPath, newPath);
                  console.log(`  ✓ Moved worksheet PDF: ${filename} -> ${folder}/${filename}`);
                }
                nextItem.worksheetPdfUrl = toCourseUrl(nextItem.worksheetPdfUrl, course.title);
                itemsModified = true;
              }
              if (nextItem.quizPdfUrl && isRootUpload(nextItem.quizPdfUrl)) {
                const filename = path.basename(nextItem.quizPdfUrl);
                const oldPath = path.resolve(uploadsDir, filename);
                const newPath = path.resolve(targetDir, filename);
                if (fs.existsSync(oldPath)) {
                  fs.renameSync(oldPath, newPath);
                  console.log(`  ✓ Moved quiz PDF: ${filename} -> ${folder}/${filename}`);
                }
                nextItem.quizPdfUrl = toCourseUrl(nextItem.quizPdfUrl, course.title);
                itemsModified = true;
              }
              return nextItem;
            });

            if (itemsModified) {
              topicUpdates.content_items = updatedItems;
              topicModified = true;
            }
          }

          if (topicModified && supabase) {
            await supabase.from('topics').update(topicUpdates).eq('id', topic.id);
            console.log(`  ✓ Updated topic "${topic.title}" in DB.`);
          }
        }

        const topicIds = (topics || []).map((t) => t.id);
        if (topicIds.length > 0 && supabase) {
          // Migrate topic_pdfs
          try {
            const { data: pdfs } = await supabase.from('topic_pdfs').select('id, file_url').in('topic_id', topicIds);
            for (const pdf of pdfs || []) {
              if (pdf.file_url && isRootUpload(pdf.file_url)) {
                const filename = path.basename(pdf.file_url);
                const oldPath = path.resolve(uploadsDir, filename);
                const newPath = path.resolve(targetDir, filename);
                if (fs.existsSync(oldPath)) {
                  fs.renameSync(oldPath, newPath);
                  console.log(`  ✓ Moved topic_pdf file: ${filename} -> ${folder}/${filename}`);
                }
                const newUrl = toCourseUrl(pdf.file_url, course.title);
                await supabase.from('topic_pdfs').update({ file_url: newUrl }).eq('id', pdf.id);
                console.log(`  ✓ Updated topic_pdf ID ${pdf.id} in DB.`);
              }
            }
          } catch (e) {
            // Table may not exist or RLS
          }

          // Migrate quizzes
          try {
            const { data: qzs } = await supabase.from('quizzes').select('id, quiz_pdf_url').in('topic_id', topicIds);
            for (const q of qzs || []) {
              if (q.quiz_pdf_url && isRootUpload(q.quiz_pdf_url)) {
                const filename = path.basename(q.quiz_pdf_url);
                const oldPath = path.resolve(uploadsDir, filename);
                const newPath = path.resolve(targetDir, filename);
                if (fs.existsSync(oldPath)) {
                  fs.renameSync(oldPath, newPath);
                  console.log(`  ✓ Moved quiz PDF file: ${filename} -> ${folder}/${filename}`);
                }
                const newUrl = toCourseUrl(q.quiz_pdf_url, course.title);
                await supabase.from('quizzes').update({ quiz_pdf_url: newUrl }).eq('id', q.id);
                console.log(`  ✓ Updated quiz ID ${q.id} in DB.`);
              }
            }
          } catch (e) {
            // Table may not exist or RLS
          }
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not migrate topics for course ${course.id}:`, err.message);
    }
  }

  // 3. Move any remaining loose files in root uploads if a default course folder is resolved
  if (defaultCourseFolder) {
    const remainingLoose = fs
      .readdirSync(uploadsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name !== '.gitkeep')
      .map((e) => e.name);

    if (remainingLoose.length > 0) {
      const targetDir = path.resolve(uploadsDir, defaultCourseFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      console.log(`\n🚚 Moving ${remainingLoose.length} remaining loose files into "${defaultCourseFolder}"...`);
      for (const file of remainingLoose) {
        const oldP = path.resolve(uploadsDir, file);
        const newP = path.resolve(targetDir, file);
        fs.renameSync(oldP, newP);
        console.log(`  ✓ Moved ${file} -> ${defaultCourseFolder}/${file}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 Upload migration completed successfully!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
