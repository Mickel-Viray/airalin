import Link from "next/link";
import { BookOpen, BrainCircuit, LineChart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="px-6 lg:px-8 h-16 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center gap-2" href="/">
          <BrainCircuit className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl tracking-tight">Airalin</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32 bg-gradient-to-b from-white to-slate-50">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-slate-900">
            Master your modules with <span className="text-blue-600">AI-powered</span> studying.
          </h1>
          <p className="mx-auto max-w-[700px] text-lg text-slate-600 md:text-xl leading-relaxed">
            Upload your PDFs, generate instant reviewers, take mock quizzes, and identify your weak topics. Airalin acts as your personal academic tutor based entirely on your course materials.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-lg px-8">
                Start Studying for Free
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto w-full px-4">
          <div className="flex flex-col items-center space-y-2 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-3 bg-blue-50 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold">Smart Summaries</h3>
            <p className="text-slate-500 text-center text-sm">Convert 100-page modules into bite-sized, readable concepts.</p>
          </div>
          <div className="flex flex-col items-center space-y-2 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-3 bg-blue-50 rounded-full">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold">Auto Quizzes</h3>
            <p className="text-slate-500 text-center text-sm">Generate multiple choice and true/false tests from your files.</p>
          </div>
          <div className="flex flex-col items-center space-y-2 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-3 bg-blue-50 rounded-full">
              <LineChart className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold">Track Progress</h3>
            <p className="text-slate-500 text-center text-sm">Identify weak topics and create personalized study plans.</p>
          </div>
        </div>
      </main>
    </div>
  );
}