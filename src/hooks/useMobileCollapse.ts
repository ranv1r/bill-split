'use client'

import { useState, useEffect } from 'react'

export const useMobileCollapse = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  useEffect(() => {
    if (!isMobile) return

    const handleSectionToggle = (event: Event) => {
      const target = event.target as HTMLElement

      // Handle sidebar section titles
      if (target.classList.contains('section-title') || target.closest('.section-title')) {
        const titleElement = target.classList.contains('section-title') ? target : target.closest('.section-title')
        const section = titleElement?.closest('.sidebar-section')
        if (section) {
          section.classList.toggle('expanded')
        }
      }

      // Handle items header
      if (target.classList.contains('items-header') || target.closest('.items-header')) {
        const headerElement = target.classList.contains('items-header') ? target : target.closest('.items-header')
        if (headerElement) {
          headerElement.classList.toggle('expanded')
        }
      }
    }

    // Add click listeners for collapsible sections
    document.addEventListener('click', handleSectionToggle)

    // Initialize collapsed state for mobile
    const initializeMobileState = () => {
      const sidebarSections = document.querySelectorAll('.sidebar-section')
      const itemsHeader = document.querySelector('.items-header')

      // Collapse all sections except Summary (second child)
      sidebarSections.forEach((section, index) => {
        if (index !== 1) { // Keep Summary (index 1) expanded
          section.classList.remove('expanded')
        }
      })

      // Collapse items table
      if (itemsHeader) {
        itemsHeader.classList.remove('expanded')
      }
    }

    // Initialize after a short delay to ensure DOM is ready
    setTimeout(initializeMobileState, 100)

    return () => {
      document.removeEventListener('click', handleSectionToggle)
    }
  }, [isMobile])

  return isMobile
}