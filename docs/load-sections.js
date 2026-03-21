// Dynamically load HTML sections
async function loadSections() {
  const sections = [
    { file: 'sections/header.html', target: 'header-container' },
    { file: 'sections/hero.html', target: 'hero-container' },
    { file: 'sections/stats.html', target: 'stats-container' },
    { file: 'sections/features.html', target: 'features-container' },
    { file: 'sections/apis.html', target: 'apis-container' },
    { file: 'sections/download.html', target: 'download-container' },
    { file: 'sections/legal.html', target: 'legal-container' },
    { file: 'sections/footer.html', target: 'footer-container' },
  ]

  for (const section of sections) {
    try {
      const response = await fetch(section.file)
      if (response.ok) {
        const html = await response.text()
        const container = document.getElementById(section.target)
        if (container) {
          container.innerHTML = html
        }
      } else {
        console.warn(`Failed to load ${section.file}: ${response.status}`)
      }
    } catch (error) {
      console.warn(`Failed to load ${section.file}:`, error)
    }
  }
}

// Load sections immediately or when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSections)
} else {
  loadSections()
}
