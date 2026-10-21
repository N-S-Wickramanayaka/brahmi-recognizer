import { MotionConfig } from 'framer-motion'
import Footer from './components/Footer'
import Header from './components/Header'
import MethodologySection from './components/MethodologySection'
import TeamSection from './components/TeamSection'
import UploadSection from './components/UploadSection'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-linen text-ink">
        <Header />
        <main>
          <UploadSection />
          <MethodologySection />
          <TeamSection />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
