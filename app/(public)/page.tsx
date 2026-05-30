"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Clock, 
  MonitorPlay, 
  Video, 
  Award,
  BookOpen,
  ArrowRight,
  Star,
  PlayCircle,
  Phone
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function Home() {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error("Error fetching featured courses:", error);
      }
      if (data) setFeaturedCourses(data);
    };
    fetchCourses();
  }, []);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* HERO SECTION */}
      <section className="bg-background relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.h1 variants={fadeInUp} className="text-5xl lg:text-7xl font-bold text-text leading-tight tracking-tight">
                Change is the end result of all true <span className="text-primary">Learning</span>
              </motion.h1>
              <motion.p variants={fadeInUp} className="text-lg text-text/70 max-w-lg leading-relaxed">
                Master mathematics with expert guidance from Michael Gad. High-quality video courses, comprehensive notes, and interactive quizzes designed for your success.
              </motion.p>
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link 
                  href="/courses" 
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:shadow-lg hover:-translate-y-1 text-center"
                >
                  Book Online
                </Link>
                <Link 
                  href="#video" 
                  className="border-2 border-primary text-primary hover:bg-primary/5 px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all"
                >
                  <PlayCircle className="w-5 h-5" />
                  Watch Video
                </Link>
              </motion.div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative hidden lg:block h-[600px]"
            >
              {/* Tutor Photo Placeholder - Will be absolute positioned */}
              <div className="absolute inset-0 bg-primary/10 rounded-[3rem] overflow-hidden flex items-center justify-center border-8 border-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer">
                 <div className="text-center p-8">
                    <span className="text-4xl">📸</span>
                    <p className="text-primary font-bold mt-4">Michael Gad Photo</p>
                 </div>
              </div>
              {/* Floating Math SVG Elements */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -top-10 -left-10 bg-white p-4 rounded-xl shadow-lg transform -rotate-12"
              >
                <span className="text-2xl font-bold text-accent">E = mc²</span>
              </motion.div>
              <motion.div 
                animate={{ y: [10, -10, 10] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute top-40 -right-12 bg-white p-4 rounded-xl shadow-lg transform rotate-12"
              >
                <span className="text-3xl font-bold text-primary">∫</span>
              </motion.div>
              <motion.div 
                animate={{ y: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute bottom-20 -left-8 bg-white p-4 rounded-xl shadow-lg transform rotate-6"
              >
                <span className="text-3xl font-bold text-primary">π ≈ 3.14</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-primary py-12">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="grid grid-cols-2 gap-8 text-center divide-x divide-white/20">
            <motion.div variants={fadeInUp}>
              <div className="text-4xl md:text-6xl font-black text-white mb-2">500+</div>
              <div className="text-white/80 font-medium text-lg uppercase tracking-wider">Happy Students</div>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <div className="text-4xl md:text-6xl font-black text-white mb-2">1,200+</div>
              <div className="text-white/80 font-medium text-lg uppercase tracking-wider">Hours of Content</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20 bg-background-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 relative -mt-32"
          >
            {[
              { icon: MonitorPlay, title: "Online Counseling", desc: "Get 1-on-1 personalized guidance to overcome your mathematical hurdles." },
              { icon: Video, title: "Video Courses", desc: "High-definition recorded lessons covering every single topic in detail." },
              { icon: Award, title: "Professional Training", desc: "Learn proven techniques to solve complex problems faster and accurately." }
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeInUp} className="bg-white p-8 rounded-2xl shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text mb-3">{feature.title}</h3>
                <p className="text-text/70 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FIND YOUR COURSE SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <h2 className="text-4xl font-bold text-text mb-4">Find Your Course</h2>
              <p className="text-lg text-text/70">Top rated courses designed for high achievement.</p>
            </div>
            <Link href="/courses" className="hidden md:flex items-center gap-2 text-primary font-bold hover:underline">
              View All Courses <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {featuredCourses.length === 0 ? (
              <div className="col-span-3 text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text mb-2">No Featured Courses</h3>
                <p className="text-text/60">Connect Supabase and publish a course to see it here.</p>
              </div>
            ) : (
              featuredCourses.map((course: any, idx: number) => (
                <Link href={`/courses/${course.id}`} key={course.id} className="block group">
                  <motion.div variants={fadeInUp} className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5 border border-gray-100 h-full flex flex-col hover:-translate-y-1 transition-transform">
                    <div className="aspect-[4/3] bg-background-alt relative overflow-hidden flex-shrink-0">
                      <div className="absolute top-4 left-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                        {idx === 0 ? 'NEW' : 'HOT'}
                      </div>
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          <BookOpen className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 text-sm text-text/60 mb-3">
                        <Star className="w-4 h-4 text-accent fill-accent" />
                        <span className="font-semibold text-text">5.0</span>
                      </div>
                      <h3 className="font-bold text-xl text-text mb-2 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                      <p className="text-text/70 text-sm mb-4 line-clamp-2 flex-grow">{course.description || "Comprehensive syllabus covering everything from basics to advanced problem solving."}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">MG</div>
                          <span className="text-sm font-medium text-text">Michael Gad</span>
                        </div>
                        <div className="font-bold text-xl text-primary">£{course.total_price}</div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* CTA BANNER SECTION */}
      <section className="bg-text text-white py-16">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Learn at your own pace on mobile and desktop</h2>
              <div className="flex items-center gap-3 text-primary font-medium text-lg">
                <Phone className="w-6 h-6" />
                <span>+20 122 529 3317</span>
              </div>
            </div>
            <div className="flex md:justify-end">
              <Link 
                href="/contact" 
                className="bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-accent/20 hover:-translate-y-1 inline-flex items-center gap-2"
              >
                Book for Free Resources <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
