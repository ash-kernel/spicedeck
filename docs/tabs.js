function switchTab(id, btn) {
  document.querySelectorAll('.doc-panel').forEach(p => p.classList.remove('visible'))
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  const panel = document.getElementById(id)
  if (panel) panel.classList.add('visible')
  if (btn) btn.classList.add('active')
}

document.addEventListener('DOMContentLoaded', () => {
  const activeBtn = document.querySelector('.tab-btn.active') || document.querySelector('.tab-btn')
  if (activeBtn) activeBtn.click()
})