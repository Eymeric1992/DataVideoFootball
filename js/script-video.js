function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const videoPlayer = document.getElementById('videoPlayer');
    const url = URL.createObjectURL(file);
    videoPlayer.src = url;
    videoPlayer.style.display = 'block';
    document.getElementById('uploadMessage').textContent = 'Vidéo chargée avec succès !';
    setTimeout(() => {
      document.getElementById('uploadMessage').textContent = '';
    }, 2000);
  }
}

// Note : Pour une analyse réelle (ex. : détection d'événements), tu devras ajouter une bibliothèque comme TensorFlow.js ou un backend.