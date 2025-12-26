import './styles.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { initMap, loadBoxes, enableAddMode, disableAddMode } from './map.js'
import { initAuth, login, register, logout, getUser } from './auth.js'
import { addBookBox, testVoting } from './bookboxes.js'

// Notification system
function showNotification(message, type = 'success') {
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideInNotification 0.3s ease-out reverse'
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

document.addEventListener('DOMContentLoaded', async () => {
  await initMap()
  await initAuth()
  setupEventListeners()
})

function setupEventListeners() {
  const modalLogin = document.getElementById('modal-login')
  const modalRegister = document.getElementById('modal-register')
  const addPanel = document.getElementById('add-panel')

  // Auth buttons
  document.getElementById('btn-login').addEventListener('click', () => {
    modalLogin.classList.remove('hidden')
  })

  document.getElementById('btn-register').addEventListener('click', () => {
    modalRegister.classList.remove('hidden')
  })

  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await logout()
      showNotification('Déconnexion réussie ! À bientôt 👋', 'success')
    } catch (err) {
      showNotification('Erreur de déconnexion : ' + err.message, 'error')
    }
  })

  // Add box - open side panel
  document.getElementById('btn-add-box').addEventListener('click', () => {
    addPanel.classList.remove('hidden')
    enableAddMode()
    document.getElementById('btn-submit-box').disabled = true
  })

  // Close panel
  document.getElementById('btn-close-panel').addEventListener('click', closeAddPanel)
  document.getElementById('btn-cancel-add').addEventListener('click', closeAddPanel)

  // Close modals
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.add('hidden')
    })
  })

  // Click outside modal to close
  ;[modalLogin, modalRegister].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden')
      }
    })
  })

  // Form login
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = e.target.querySelector('input[type="email"]').value
    const password = e.target.querySelector('input[type="password"]').value
    
    const submitBtn = e.target.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<div class="spinner"></div> Connexion...'
    submitBtn.disabled = true
    
    try {
      await login(email, password)
      modalLogin.classList.add('hidden')
      e.target.reset()
      await loadBoxes()
      showNotification('Connexion réussie ! Bienvenue 👋', 'success')
    } catch (err) {
      showNotification('Erreur de connexion : ' + err.message, 'error')
    } finally {
      submitBtn.innerHTML = originalText
      submitBtn.disabled = false
    }
  })

  // Form register
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = e.target.querySelector('input[type="email"]').value
    const password = e.target.querySelector('input[type="password"]').value
    
    const submitBtn = e.target.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<div class="spinner"></div> Inscription...'
    submitBtn.disabled = true
    
    try {
      await register(email, password)
      modalRegister.classList.add('hidden')
      e.target.reset()
      showNotification('Inscription réussie ! Vérifiez votre email 📧', 'success')
    } catch (err) {
      showNotification('Erreur d\'inscription : ' + err.message, 'error')
    } finally {
      submitBtn.innerHTML = originalText
      submitBtn.disabled = false
    }
  })

  // Form add box
  document.getElementById('form-add-box').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const user = getUser()
    if (!user) {
      showNotification('Vous devez être connecté pour ajouter une boîte', 'error')
      return
    }

    const lat = document.getElementById('box-lat').value
    const lng = document.getElementById('box-lng').value

    if (!lat || !lng) {
      showNotification('Cliquez sur la carte pour placer la boîte', 'error')
      return
    }

    const submitBtn = e.target.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<div class="spinner"></div> Ajout en cours...'
    submitBtn.disabled = true

    const box = {
      name: document.getElementById('box-name').value || null,
      description: document.getElementById('box-description').value || null,
      address: document.getElementById('box-address').value,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      created_by: user.id
    }

    try {
      await addBookBox(box)
      closeAddPanel()
      e.target.reset()
      await loadBoxes()
      showNotification('Boîte à livres ajoutée avec succès ! 📚', 'success')
    } catch (err) {
      showNotification('Erreur lors de l\'ajout : ' + err.message, 'error')
    } finally {
      submitBtn.innerHTML = originalText
      submitBtn.disabled = false
    }
  })
}

function closeAddPanel() {
  document.getElementById('add-panel').classList.add('hidden')
  document.getElementById('form-add-box').reset()
  document.getElementById('coords-text').textContent = 'Cliquez sur la carte pour définir la position...'
  document.getElementById('btn-submit-box').disabled = true
  disableAddMode()
}
