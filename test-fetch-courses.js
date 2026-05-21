const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://prmtqzullxcrnllhfhte.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybXRxenVsbHhjcm5sbGhmaHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTYwNTIsImV4cCI6MjA5MzU3MjA1Mn0.ahGVZvcOYSg-UhRWKjIbGY0oU6wwTJo_Zr1WmiRZUe8";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Fetching all courses in the database...");
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, is_published, total_price');

  if (error) {
    console.error("Database query error:", error);
  } else {
    console.log("SUCCESS! Here are all the courses found in your database:");
    if (courses.length === 0) {
      console.log("There are no courses in the 'courses' table.");
    } else {
      courses.forEach(c => {
        console.log(`- Title: "${c.title}" | ID: ${c.id} | Is Published: ${c.is_published} | Price: £${c.total_price}`);
      });
    }
  }
}

main();
