
    const audio = document.getElementById('audio');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatSelect = document.getElementById('repeatSelect');
    const speedSelect = document.getElementById('speedSelect');
    const abSetA = document.getElementById('abSetA');
    const abSetB = document.getElementById('abSetB');
    const abReset = document.getElementById('abReset');
    const backward5s = document.getElementById('backward5s');
    const forward5s = document.getElementById('forward5s');
    const currentTrackName = document.getElementById('currentTrackName');
    const currentTime = document.getElementById('currentTime');
    const progressContainer = document.getElementById('progressContainer');
    const progress = document.getElementById('progress');
    const playlistInput = document.getElementById('playlistInput');
    const playlistUI = document.getElementById('playlist');
    let playlist = [];
    let currentIndex = 0;
    let isShuffling = false;
    let isRepeating = 'none'; // none, all, one
    let abPoints = {
      a: null,
      b: null
    };

    function loadTrack(index) {
      const track = playlist[index];
      if (!track) return;
      currentIndex = index;
      audio.src = track.url;
      currentTrackName.textContent = track.name;
      audio.load();
      playPauseBtn.textContent = '▶️';
      updatePlaylistHighlight();
    }

    function playPauseTrack() {
      if (audio.paused) {
        audio.play();
        playPauseBtn.textContent = '⏸';
      } else {
        audio.pause();
        playPauseBtn.textContent = '▶️';
      }
    }

    function nextTrack() {
      if (isShuffling) {
        currentIndex = Math.floor(Math.random() * playlist.length);
      } else {
        currentIndex = (currentIndex + 1) % playlist.length;
      }
      loadTrack(currentIndex);
      audio.play();
    }

    function prevTrack() {
      currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      loadTrack(currentIndex);
      audio.play();
    }

    function updateABTimes() {
      const a = abPoints.a !== null ? formatTime(abPoints.a) : 'Not Set';
      const b = abPoints.b !== null ? formatTime(abPoints.b) : 'Not Set';
      abSetA.textContent = `A (${a})`;
      abSetB.textContent = `B (${b})`;
    }

    function formatTime(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
    }

    function updateProgress() {
      const percent = (audio.currentTime / audio.duration) * 100;
      progress.style.width = `${percent}%`;
      currentTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }

    function setProgress(e) {
      const totalWidth = progressContainer.offsetWidth;
      const clickX = e.offsetX;
      const newTime = (clickX / totalWidth) * audio.duration;
      if (abPoints.a !== null && newTime < abPoints.a) {
        audio.currentTime = abPoints.a;
      } else if (abPoints.b !== null && newTime > abPoints.b) {
        audio.currentTime = abPoints.b;
      } else {
        audio.currentTime = newTime;
      }
    }

    function updatePlaylistHighlight() {
      Array.from(playlistUI.children).forEach((li, index) => {
        if (index === currentIndex) {
          li.classList.add('nowPlaying');
        } else {
          li.classList.remove('nowPlaying');
        }
      });
    }

    function renderPlaylist() {
      playlistUI.innerHTML = '';
      playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        const trackDuration = track.duration ? formatTime(track.duration) : "Loading...";
        li.innerHTML = `
          <span>${track.name}</span>
          <span style="margin-left: auto; margin-right: 10px;">${trackDuration}</span>
          <button class="delete-btn" onclick="deleteTrack(${index})">Delete</button>
        `;
        playlistUI.appendChild(li);
        // Attempt to load duration if not available
        if (!track.duration) {
          const tempAudio = new Audio(track.url);
          tempAudio.addEventListener('loadedmetadata', () => {
            track.duration = tempAudio.duration;
            renderPlaylist();
          });
        }
      });
      updatePlaylistHighlight();
    }

    function deleteTrack(index) {
      playlist.splice(index, 1);
      if (index === currentIndex) {
        if (playlist.length === 0) {
          audio.pause();
          currentTrackName.textContent = 'No track playing';
          currentIndex = 0;
        } else {
          currentIndex = Math.min(index, playlist.length - 1);
          loadTrack(currentIndex);
        }
      } else if (index < currentIndex) {
        currentIndex--;
      }
      renderPlaylist();
    }

    function handleDragStart(e) {
      e.dataTransfer.setData('text/plain', e.target.dataset.index);
      e.target.classList.add('dragging');
    }

    function handleDragOver(e) {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      const afterElement = getDragAfterElement(playlistUI, e.clientY);
      if (afterElement == null) {
        playlistUI.appendChild(dragging);
      } else {
        playlistUI.insertBefore(dragging, afterElement);
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIndex = [...playlistUI.children].indexOf(e.target);
      if (toIndex !== fromIndex) {
        const [movedItem] = playlist.splice(fromIndex, 1);
        playlist.splice(toIndex, 0, movedItem);
        if (currentIndex === fromIndex) {
          currentIndex = toIndex;
        } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
          currentIndex--;
        } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
          currentIndex++;
        }
        renderPlaylist();
      }
    }

    function handleDragEnd(e) {
      e.target.classList.remove('dragging');
    }

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return {
            offset,
            element: child
          };
        } else {
          return closest;
        }
      }, {
        offset: Number.NEGATIVE_INFINITY
      }).element;
    }

    function updatePlaylistHighlight() {
      Array.from(playlistUI.children).forEach((li, index) => {
        li.classList.toggle('nowPlaying', index === currentIndex);
      });
    }
    audio.addEventListener('timeupdate', () => {
      updateProgress();
      if (abPoints.a !== null && abPoints.b !== null) {
        if (audio.currentTime > abPoints.b || audio.currentTime < abPoints.a) {
          audio.currentTime = abPoints.a;
        }
      }
    });
    audio.addEventListener('ended', () => {
      if (isRepeating === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (isRepeating === 'all' || currentIndex < playlist.length - 1) {
        nextTrack();
      }
    });
    playPauseBtn.addEventListener('click', playPauseTrack);
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);
    shuffleBtn.addEventListener('click', () => {
      isShuffling = !isShuffling;
      shuffleBtn.classList.toggle('active', isShuffling);
    });
    repeatSelect.addEventListener('change', () => {
      isRepeating = repeatSelect.value;
    });
    speedSelect.addEventListener('input', () => {
      audio.playbackRate = parseFloat(speedSelect.value);
    });
    abSetA.addEventListener('click', () => {
      abPoints.a = audio.currentTime;
      updateABTimes();
    });
    abSetB.addEventListener('click', () => {
      abPoints.b = audio.currentTime;
      updateABTimes();
    });
    abReset.addEventListener('click', () => {
      abPoints.a = null;
      abPoints.b = null;
      updateABTimes();
    });
    backward5s.addEventListener('click', () => {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    });
    forward5s.addEventListener('click', () => {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    });
    progressContainer.addEventListener('click', setProgress);
    playlistInput.addEventListener('change', (e) => {
      playlist = Array.from(e.target.files).map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
      renderPlaylist();
      loadTrack(0);
    });
    playlistUI.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      if (index !== undefined) {
        loadTrack(Number(index));
        audio.play();
      }
    });
    // Initial AB points display update
    updateABTimes();
    document.querySelector("#selectbutton").addEventListener("click", () => {
      document.querySelector("input").click();
    });
    renderPlaylist();
        function renderPlaylist() {
      playlistUI.innerHTML = '';
      playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        const trackDuration = track.duration ? formatTime(track.duration) : "Loading...";
        li.innerHTML = `
          <span>${track.name}</span>
          <span style="margin-left: auto; margin-right: 10px;">${trackDuration}</span>
          <button class="delete-btn" onclick="deleteTrack(${index})">Delete</button>
        `;
        playlistUI.appendChild(li);
        // Attempt to load duration if not available
        if (!track.duration) {
          const tempAudio = new Audio(track.url);
          tempAudio.addEventListener('loadedmetadata', () => {
            track.duration = tempAudio.duration;
            savePlaylist();
            renderPlaylist();
          });
        }
      });
      updatePlaylistHighlight();
    }

    function savePlaylist() {
      const playlistToSave = playlist.map(track => ({
        name: track.name,
        url: track.url,
        duration: track.duration || null
      }));
      localStorage.setItem('savedPlaylist', JSON.stringify(playlistToSave));
      localStorage.setItem('currentIndex', currentIndex);
    }

    function loadSavedPlaylist() {
      const savedPlaylist = JSON.parse(localStorage.getItem('savedPlaylist')) || [];
      const savedIndex = localStorage.getItem('currentIndex');
      playlist = savedPlaylist.map(track => ({
        name: track.name,
        url: track.url,
        duration: track.duration
      }));
      currentIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
      renderPlaylist();
      if (playlist.length > 0) {
        loadTrack(currentIndex);
      }
    }

    function saveCurrentTrack() {
      localStorage.setItem('currentIndex', currentIndex);
    }

    function loadTrack(index) {
      const track = playlist[index];
      if (!track) return;
      currentIndex = index;
      saveCurrentTrack();
      audio.src = track.url;
      currentTrackName.textContent = track.name;
      audio.load();
      playPauseBtn.textContent = '▶️';
      updatePlaylistHighlight();
    }

    audio.addEventListener('ended', () => {
      if (isRepeating === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (isRepeating === 'all' || currentIndex < playlist.length - 1) {
        nextTrack();
      }
    });

    function nextTrack() {
      if (isShuffling) {
        currentIndex = Math.floor(Math.random() * playlist.length);
      } else {
        currentIndex = (currentIndex + 1) % playlist.length;
      }
      saveCurrentTrack();
      loadTrack(currentIndex);
      audio.play();
    }

    function prevTrack() {
      currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      saveCurrentTrack();
      loadTrack(currentIndex);
      audio.play();
    }

    playlistInput.addEventListener('change', (e) => {
      playlist = Array.from(e.target.files).map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        duration: null
      }));
      savePlaylist();
      renderPlaylist();
      loadTrack(0);
    });

    function deleteTrack(index) {
      playlist.splice(index, 1);
      if (index === currentIndex) {
        if (playlist.length === 0) {
          audio.pause();
          currentTrackName.textContent = 'No track playing';
          currentIndex = 0;
        } else {
          currentIndex = Math.min(index, playlist.length - 1);
          loadTrack(currentIndex);
        }
      } else if (index < currentIndex) {
        currentIndex--;
      }
      savePlaylist();
      renderPlaylist();
    }

    document.addEventListener('DOMContentLoaded', loadSavedPlaylist);
