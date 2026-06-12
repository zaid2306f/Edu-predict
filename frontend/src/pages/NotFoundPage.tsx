import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <p className="text-8xl font-bold gradient-text">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        <Link to="/dashboard">
          <Button className="mt-6" variant="gradient">
            <Home className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
