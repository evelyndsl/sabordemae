import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand />
        <div className="site-header__actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
