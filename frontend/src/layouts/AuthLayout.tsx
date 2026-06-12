import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between gradient-primary p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          <span className="text-2xl font-bold">EduPredict</span>
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold leading-tight">
            Big Data Educational
            <br />
            Analytics Platform
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Predict student outcomes, analyze attendance patterns, and drive academic success with AI-powered insights.
          </p>
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="relative h-48"
        >
          <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
            {['12.4K', '91.5%', '342'].map((v, i) => (
              <div key={i} className="rounded-lg bg-white/20 p-3 text-center">
                <p className="text-xl font-bold">{v}</p>
                <p className="text-xs text-white/70">
                  {['Students', 'Attendance', 'At Risk'][i]}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold gradient-text">EduPredict</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
