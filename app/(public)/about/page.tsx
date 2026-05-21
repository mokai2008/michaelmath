import { CheckCircle2, Award, BookOpen, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <section className="bg-primary py-20 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Michael Gad</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Dedicated to transforming the way students perceive and learn mathematics through innovative teaching methods.
          </p>
        </div>
      </section>

      {/* Bio Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">A Passion for Mathematics & Teaching</h2>
              <div className="space-y-4 text-lg text-text/70 leading-relaxed mb-8">
                <p>
                  With over a decade of experience in education, I have dedicated my career to demystifying mathematics for students of all levels. I believe that anyone can master math with the right guidance, patience, and resources.
                </p>
                <p>
                  My teaching philosophy revolves around building a strong foundational understanding before tackling complex problems. I focus on the "why" rather than just the "how", ensuring that my students develop critical thinking skills that serve them beyond the classroom.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Award, title: "10+ Years", desc: "Teaching Experience" },
                  { icon: Users, title: "500+", desc: "Successful Students" },
                  { icon: BookOpen, title: "20+", desc: "Courses Created" },
                  { icon: CheckCircle2, title: "99%", desc: "Pass Rate" }
                ].map((stat, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-text">{stat.title}</h4>
                      <p className="text-sm text-text/70">{stat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="order-1 lg:order-2 relative">
              <div className="aspect-[3/4] bg-background-alt rounded-3xl overflow-hidden border-8 border-white shadow-2xl relative">
                {/* Photo Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl">📸</span>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <div className="font-bold text-lg text-text">Certified</div>
                  <div className="text-sm text-text/70">Expert Tutor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teaching Philosophy */}
      <section className="py-20 bg-text text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8">My Teaching Philosophy</h2>
          <blockquote className="text-2xl font-medium leading-relaxed italic text-white/90">
            "Education is not the learning of facts, but the training of the mind to think. I strive to empower my students to approach mathematical problems with confidence and creativity."
          </blockquote>
          <div className="mt-8 font-bold text-primary">— Michael Gad</div>
        </div>
      </section>
    </div>
  );
}
