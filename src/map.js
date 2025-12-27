import L from 'leaflet';
import 'leaflet.markercluster';
import { getBookBoxes, vote, removeVote, getUserVote } from './bookboxes.js';
import { getUser, onAuthChange } from './auth.js';

let map;
let addModeActive = false;
let tempMarker = null;
let userLocationMarker = null;
let bookBoxesData = [];
let markersLayer;

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiMzMzMiLz4KPHBhdGggZD0iTTEyLjUgNDBMMTIuNSAyNSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiMzMzMiLz4KPHBhdGggZD0iTTEyLjUgNDBMMTIuNSAyNSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
  shadowUrl: '',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons
const bookIcon = L.divIcon({
  html: `<div class="book-marker">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  </div>`,
  className: 'custom-book-icon',
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -25]
});

const userLocationIcon = L.divIcon({
  html: `<div class="user-location-marker">
    <div class="location-dot"></div>
    <div class="location-pulse"></div>
  </div>`,
  className: 'custom-user-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const pinIcon = L.divIcon({
  html: `<div class="pin-marker">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8"/>
    </svg>
  </div>`,
  className: 'custom-pin-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

export async function initMap() {
  console.log('🗺️ Début initialisation carte...');
  
  // Vérifier que le DOM est prêt
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('❌ Conteneur #map introuvable !');
    return;
  }
  
  console.log('✅ Conteneur trouvé, dimensions:', {
    width: mapContainer.offsetWidth,
    height: mapContainer.offsetHeight,
    display: getComputedStyle(mapContainer).display,
    position: getComputedStyle(mapContainer).position
  });
  
  // Créer une carte simple d'abord
  try {
    console.log('✅ Leaflet disponible');
    
    // Créer la carte
    map = L.map('map', {
      zoomControl: false
    }).setView([46.603354, 1.888334], 6);
    console.log('✅ Carte créée');
    
    // Ajouter les tuiles avec fallback
    const tileUrls = [
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
    ];
    
    let tileLayer;
    for (const url of tileUrls) {
      try {
        tileLayer = L.tileLayer(url, {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          subdomains: 'abcd'
        });
        tileLayer.addTo(map);
        console.log('✅ Tuiles ajoutées avec:', url);
        break;
      } catch (error) {
        console.log('❌ Échec tuiles:', url, error);
        continue;
      }
    }
    
    // Ajouter les contrôles de zoom
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    
    // Créer le groupe de clustering
    markersLayer = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 50;
        let className = 'cluster-small';
        
        if (count > 50) {
          size = 70;
          className = 'cluster-large';
        } else if (count > 20) {
          size = 60;
          className = 'cluster-medium';
        }
        
        return L.divIcon({
          html: `<div class="cluster-icon ${className}">
            <span class="cluster-count">${count}</span>
          </div>`,
          className: 'custom-cluster',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
        });
      }
    }).addTo(map);
    console.log('✅ Clustering activé');
    
    // Ajouter les gestionnaires d'événements
    map.on('click', onMapClick);
    
    // Forcer le redimensionnement
    setTimeout(() => {
      map.invalidateSize();
      console.log('✅ Carte redimensionnée');
    }, 100);
    
    // Charger les données
    console.log('📍 Chargement des boîtes à livres...');
    await loadBoxes();
    
    // Recharger les boîtes quand l'utilisateur se connecte/déconnecte
    onAuthChange(async (user) => {
      console.log('🔄 Auth changé, rechargement des boîtes...', user?.email || 'déconnecté');
      await loadBoxes();
    });
    
    // Géolocalisation
    requestUserLocation();
    
    console.log('🎉 Carte initialisée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur Leaflet:', error);
    
    // Fallback avec carte statique
    mapContainer.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.2rem;
        text-align: center;
        position: relative;
      ">
        <div>
          <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
          <div>Carte temporairement indisponible</div>
          <div style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">
            Erreur: ${error.message}
          </div>
          <button onclick="location.reload()" style="
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            color: white;
            cursor: pointer;
          ">
            Recharger
          </button>
        </div>
      </div>
    `;
  }
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    console.log('Géolocalisation non supportée');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
      }
      
      userLocationMarker = L.marker([latitude, longitude], { 
        icon: userLocationIcon,
        zIndexOffset: 1000
      }).addTo(map);
      
      // Marqueur propre sans popup ni tooltip
      
      // Add accuracy circle with better styling
      const accuracy = position.coords.accuracy;
      if (accuracy < 1000) {
        L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.05,
          weight: 1,
          opacity: 0.3,
          dashArray: '5, 5'
        }).addTo(map);
      }
      
      console.log('✅ Position utilisateur ajoutée');
    },
    (error) => {
      console.log('Erreur géolocalisation:', error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

function onMapClick(e) {
  if (!addModeActive) return;

  const { lat, lng } = e.latlng;

  if (tempMarker) {
    tempMarker.setLatLng([lat, lng]);
  } else {
    tempMarker = L.marker([lat, lng], { 
      icon: pinIcon,
      draggable: true 
    }).addTo(map);

    tempMarker.on('dragend', () => {
      const pos = tempMarker.getLatLng();
      updateFormCoords(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    });
  }

  updateFormCoords(lat, lng);
  reverseGeocode(lat, lng);
}

function updateFormCoords(lat, lng) {
  document.getElementById('box-lat').value = lat.toFixed(6);
  document.getElementById('box-lng').value = lng.toFixed(6);
  document.getElementById('coords-text').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  document.getElementById('btn-submit-box').disabled = false;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    if (data.display_name) {
      document.getElementById('box-address').value = data.display_name.split(',').slice(0, 3).join(',').trim();
    }
  } catch (e) {
    console.log('Geocoding failed');
    document.getElementById('box-address').value = `Adresse approximative: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function enableAddMode() {
  addModeActive = true;
  if (map) {
    map.getContainer().style.cursor = 'crosshair';
  }
}

export function disableAddMode() {
  addModeActive = false;
  if (map) {
    map.getContainer().style.cursor = '';
  }
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

export async function loadBoxes() {
  try {
    console.log('📦 Chargement des boîtes depuis Supabase...');
    
    // Clear existing markers
    if (markersLayer) {
      markersLayer.clearLayers();
    }
    
    const boxes = await getBookBoxes();
    console.log(`✅ ${boxes.length} boîtes chargées:`, boxes);
    
    bookBoxesData = boxes;
    const user = getUser();
    console.log('👤 Utilisateur actuel:', user ? `${user.email} (${user.id})` : 'Non connecté');

    for (const box of boxes) {
      console.log(`📍 Ajout marqueur pour: ${box.name || 'Boîte sans nom'} à [${box.latitude}, ${box.longitude}]`);
      
      const marker = L.marker([box.latitude, box.longitude], { icon: bookIcon });
      
      const popupContent = createPopupContent(box, user);
      marker.bindPopup(popupContent, { 
        minWidth: 280, 
        maxWidth: 320,
        className: 'custom-popup'
      });
      
      marker.on('popupopen', () => {
        console.log(`🔓 Popup ouverte pour boîte ${box.id}`);
        setupVoteListeners(box, user, marker);
      });

      if (markersLayer) {
        markersLayer.addLayer(marker);
      }
    }

    console.log(`🎉 ${boxes.length} marqueurs ajoutés à la carte !`);
    
  } catch (err) {
    console.error('❌ Erreur chargement boîtes:', err);
  }
}

function createPopupContent(box, user) {
  console.log(`🎨 Création popup pour boîte ${box.id}:`, {
    name: box.name,
    upvotes: box.upvotes,
    downvotes: box.downvotes,
    score: box.score,
    userConnected: !!user,
    userEmail: user?.email
  });
  
  return `
    <div class="popup-content" data-box-id="${box.id}">
      <h3>
        📚 ${box.name || 'Boîte à livres'}
      </h3>
      ${box.description ? `<p class="description">${box.description}</p>` : ''}
      <div class="address">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${box.address}</span>
      </div>
      <div class="creator">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Ajoutée par ${box.creator_name || 'Anonyme'}</span>
      </div>
      
      <div class="vote-section">
        <button class="vote-btn upvote ${user ? '' : 'disabled'}" data-vote="1" ${!user ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M7 10l5-5 5 5"/>
            <path d="M12 5v14"/>
          </svg>
          <span>${box.upvotes || 0}</span>
        </button>
        <div class="score ${box.score > 0 ? 'positive' : box.score < 0 ? 'negative' : ''}">${box.score || 0}</div>
        <button class="vote-btn downvote ${user ? '' : 'disabled'}" data-vote="-1" ${!user ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M17 14l-5 5-5-5"/>
            <path d="M12 19V5"/>
          </svg>
          <span>${box.downvotes || 0}</span>
        </button>
      </div>
      ${!user ? '<div class="login-notice">Connectez-vous pour voter</div>' : ''}
    </div>
  `;
}

async function setupVoteListeners(box, user, marker) {
  const popup = marker.getPopup().getElement();
  if (!popup) return;

  const upvoteBtn = popup.querySelector('.upvote');
  const downvoteBtn = popup.querySelector('.downvote');

  // Toujours récupérer l'utilisateur frais
  const currentUser = getUser();
  
  if (!currentUser) {
    console.log('❌ Utilisateur non connecté, votes désactivés');
    return;
  }

  console.log(`🗳️ Configuration des votes pour la boîte ${box.id}, utilisateur ${currentUser.id}`);

  try {
    let currentVote = await getUserVote(box.id, currentUser.id);
    console.log(`📊 Vote actuel: ${currentVote}`);
    
    // Reset classes
    upvoteBtn.classList.remove('active', 'disabled');
    downvoteBtn.classList.remove('active', 'disabled');
    upvoteBtn.disabled = false;
    downvoteBtn.disabled = false;
    
    // Apply current vote state
    if (currentVote === 1) {
      upvoteBtn.classList.add('active');
    } else if (currentVote === -1) {
      downvoteBtn.classList.add('active');
    }

    // Add click handlers with fresh user state
    upvoteBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const freshUser = getUser();
      if (!freshUser) {
        console.log('❌ Utilisateur non connecté');
        alert('Veuillez vous connecter pour voter');
        return;
      }
      
      console.log('👍 Clic upvote');
      const freshVote = await getUserVote(box.id, freshUser.id);
      await handleVote(box.id, 1, freshVote, marker);
    };
    
    downvoteBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const freshUser = getUser();
      if (!freshUser) {
        console.log('❌ Utilisateur non connecté');
        alert('Veuillez vous connecter pour voter');
        return;
      }
      
      console.log('👎 Clic downvote');
      const freshVote = await getUserVote(box.id, freshUser.id);
      await handleVote(box.id, -1, freshVote, marker);
    };
    
    console.log('✅ Listeners de vote configurés');
    
  } catch (err) {
    console.error('❌ Erreur lors de la configuration des votes:', err);
  }
}

async function handleVote(boxId, voteType, currentVote, marker) {
  const user = getUser();
  if (!user) {
    console.log('❌ Utilisateur non connecté');
    return;
  }

  console.log(`🗳️ Traitement vote: boîte ${boxId}, type ${voteType}, vote actuel ${currentVote}`);

  try {
    if (currentVote === voteType) {
      // L'utilisateur clique sur le même vote -> le retirer
      console.log('🔄 Suppression du vote existant');
      await removeVote(boxId, user.id);
    } else {
      // Nouveau vote ou changement de vote
      console.log('✅ Ajout/modification du vote');
      await vote(boxId, user.id, voteType);
    }
    
    // Fermer le popup et recharger les données
    marker.closePopup();
    console.log('🔄 Rechargement des boîtes...');
    await loadBoxes();
    console.log('✅ Vote traité avec succès');
    
  } catch (err) {
    console.error('❌ Erreur lors du vote:', err);
    alert('Erreur lors du vote. Veuillez réessayer.');
  }
}

function updateCount(count) {
  const countEl = document.getElementById('box-count');
  if (countEl) countEl.textContent = count;
}

export function getMap() {
  return map;
}