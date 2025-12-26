import { supabase } from './supabase.js'

let currentUser = null

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    currentUser = session.user
    updateUI(currentUser)
  }

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null
    updateUI(currentUser)
  })
}

export function getUser() {
  return currentUser
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data.user
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

function updateUI(user) {
  const btnLogin = document.getElementById('btn-login')
  const btnRegister = document.getElementById('btn-register')
  const userMenu = document.getElementById('user-menu')
  const userEmail = document.getElementById('user-email')
  const btnAddBox = document.getElementById('btn-add-box')

  if (user) {
    btnLogin.classList.add('hidden')
    btnRegister.classList.add('hidden')
    userMenu.classList.remove('hidden')
    userEmail.textContent = user.email
    btnAddBox.classList.remove('hidden')
  } else {
    btnLogin.classList.remove('hidden')
    btnRegister.classList.remove('hidden')
    userMenu.classList.add('hidden')
    btnAddBox.classList.add('hidden')
  }
}
