document.addEventListener('DOMContentLoaded', () => {
  const sections = ['home','features','download','legal']
  const navLinks = document.querySelectorAll('.nav-link')

  const updateActive = () => {
    let current = 'home'
    sections.forEach(id => {
      const el = document.getElementById(id)
      if (el && window.scrollY >= el.offsetTop - 120) current = id
    })
    navLinks.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === `#${current}`)
    })
  }

  updateActive()
  window.addEventListener('scroll', updateActive, { passive: true })
  window.addEventListener('hashchange', updateActive)
})