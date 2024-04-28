import React, { useState, useEffect } from "react";
import { database } from "../firebase-config";
import { ref, get, set, update } from "firebase/database";
import { getTrackInfo } from "../Spotify";
import { searchTracks, currentToken } from "../Spotify";
import { useNavigate } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import "../css/Swipe.css";

function Swipe({ eventId }) {
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTrackInfo, setCurrentTrackInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [userTracks, setUserTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [swipeEnd, setSwipeEnd] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [remainingAdds, setRemainingAdds] = useState(3);
  const [limiteAjout, setLimiteAjout] = useState(0);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!currentToken.access_token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchUserTracks = async () => {
      if (userId) {
        const tracks = await getUserTracks(userId);
        setUserTracks(tracks);
      }
    };

    fetchUserTracks();
  }, [userId]);

  useEffect(() => {
    const fetchRemainingAdds = async () => {
      try {
        const limiteAjoutRef = ref(database, `events/${eventId}/limiteAjout`);
        const limiteAjoutSnapshot = await get(limiteAjoutRef);
        const limiteAjout = limiteAjoutSnapshot.val();
        setLimiteAjout(limiteAjout); // Mise à jour de l'état local limiteAjout
        const userSongsRef = ref(
          database,
          `events/${eventId}/users/${userId}/songsAdded`
        );
        const userSongsSnapshot = await get(userSongsRef);
        const userSongsCount = userSongsSnapshot.val()
          ? userSongsSnapshot.val()
          : 0;
        const remainingAdds = limiteAjout - userSongsCount;
        setRemainingAdds(remainingAdds);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération du nombre d'ajouts restants :",
          error
        );
      }
    };

    fetchRemainingAdds();
  }, [eventId, userId]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;

    try {
      const tracks = await searchTracks(searchTerm, currentToken.access_token);
      setSearchResults(tracks);
    } catch (error) {
      console.error("Erreur lors de la recherche de pistes :", error);
    }
  };

  const addTrackToEventPlaylist = async (trackId) => {
    try {
      const eventPlaylistRef = ref(
        database,
        `playlists/${eventId}/tracks/${trackId}`
      );
      const playlistSnapshot = await get(eventPlaylistRef);

      if (playlistSnapshot.exists()) {
        console.log("La piste est déjà dans la playlist de l'événement.");
        setErrorMessage("La piste est déjà dans la playlist de l'événement.");
        return;
      }

      const userSongsRef = ref(
        database,
        `events/${eventId}/users/${userId}/songsAdded`
      );
      const userSongsSnapshot = await get(userSongsRef);

      const limiteAjoutRef = ref(database, `events/${eventId}/limiteAjout`);
      const limiteAjoutSnapshot = await get(limiteAjoutRef);

      const userSongsCount = userSongsSnapshot.val()
        ? userSongsSnapshot.val() + 1
        : 1;
      const limiteAjout = limiteAjoutSnapshot.val();

      if (userSongsCount > limiteAjout) {
        console.log(
          "Limite d'ajout de chansons atteinte pour cet utilisateur."
        );
        setErrorMessage(
          "Limite d'ajout de chansons atteinte pour cet utilisateur."
        );
        return;
      }

      await set(eventPlaylistRef, { id: trackId, like: 0 });
      await set(userSongsRef, userSongsCount);

      console.log("Piste ajoutée à la playlist de l'événement.");
      setErrorMessage("");
      window.location.reload();
    } catch (error) {
      console.error(
        "Erreur lors de l'ajout de la piste à la playlist de l'événement :",
        error
      );
    }
  };

  const addToUserTracks = async (userId, trackId) => {
    const userTracksRef = ref(
      database,
      `users/${userId}/tracksMeet/${trackId}`
    );
    await set(userTracksRef, trackId);
  };

  const getUserTracks = async (userId) => {
    try {
      const userTracksRef = ref(database, `users/${userId}/tracksMeet`);
      const userTracksSnapshot = await get(userTracksRef);
      if (userTracksSnapshot.exists()) {
        const userTracksData = userTracksSnapshot.val();
        const userTracks = Object.keys(userTracksData);
        return userTracks;
      } else {
        console.log("Aucune musique rencontrée pour cet utilisateur.");
        return [];
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des musiques rencontrées :",
        error
      );
      return [];
    }
  };

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const playlistRef = ref(database, `playlists/${eventId}/tracks`);
        const playlistSnapshot = await get(playlistRef);
        if (playlistSnapshot.exists()) {
          const playlistData = playlistSnapshot.val();
          const tracks = Object.entries(playlistData).map(([id, track]) => ({
            id,
            ...track,
          }));
          const filteredTracks = tracks.filter((track) => {
            return !userTracks.includes(track.id);
          });
          setPlaylist(filteredTracks);
          if (playlist.length > 0) {
            setSwipeEnd(false);
          }
          // setLoading(false); // Mettre fin au chargement une fois que les musiques sont chargées
        } else {
          console.log("Playlist non trouvée");
          // setLoading(false); // Mettre fin au chargement si aucune playlist n'est trouvée
        }
      } catch (error) {
        console.error("Erreur :", error);
        // setLoading(false); // Mettre fin au chargement en cas d'erreur
      }
    };

    fetchPlaylist();
  }, [eventId, userTracks, playlist.length]);

  useEffect(() => {
    const fetchTrackInfo = async () => {
      if (playlist.length > 0) {
        const trackId = playlist[currentIndex].id;
        try {
          // Vérifier si l'ID du morceau est différent du premier ID de la playlist de référence
          // ou si le premier ID de la playlist de référence ne se trouve pas dans les userTracks
          const firstTrackId = playlist[0].id;
          if (trackId !== firstTrackId || !userTracks.includes(firstTrackId)) {
            const trackInfo = await getTrackInfo(trackId);
            setCurrentTrackInfo(trackInfo);
            setLoading(false);
          } else {
            // Ne pas mettre à jour le morceau actuel car il ne remplit pas les critères
            console.log(
              "L'ID du morceau est le même que celui du premier morceau de la playlist ou est présent dans les userTracks."
            );
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des informations sur la piste :",
            error
          );
        }
      } else if (playlist.length === 0) {
        setSwipeEnd(true);
        setLoading(false);
      }
    };

    fetchTrackInfo();
  }, [playlist, currentIndex, userTracks]);

  useEffect(() => {
    const audioElement = document.getElementById("audioPreview");

    const handleCanPlayThrough = () => {
      if (audioElement) {
        audioElement.play().catch((error) => {
          console.error(
            "Impossible de démarrer la lecture automatique :",
            error
          );
        });
      }
    };

    if (audioElement) {
      audioElement.addEventListener("canplaythrough", handleCanPlayThrough);
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener(
          "canplaythrough",
          handleCanPlayThrough
        );
      }
    };
  }, [currentTrackInfo]);

  useEffect(() => {
    const audioElement = document.getElementById("audioPreview");
    if (audioElement) {
      audioElement.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  const nextTrack = async () => {
    if (currentIndex < playlist.length - 1) {
      const currentTrackId = playlist[currentIndex].id;
      const eventPlaylistRef = ref(
        database,
        `playlists/${eventId}/tracks/${currentTrackId}`
      );
      await update(eventPlaylistRef, { like: playlist[currentIndex].like + 1 });
      await addToUserTracks(userId, currentTrackId);
      setCurrentIndex((prevIndex) => prevIndex + 1);
    } else if (currentIndex === playlist.length - 1) {
      const currentTrackId = playlist[currentIndex].id;
      const eventPlaylistRef = ref(
        database,
        `playlists/${eventId}/tracks/${currentTrackId}`
      );
      await update(eventPlaylistRef, { like: playlist[currentIndex].like + 1 });
      await addToUserTracks(userId, currentTrackId);
      setSwipeEnd(true);
    }
  };

  const prevTrack = async () => {
    if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
      const currentTrackId = playlist[currentIndex].id;
      await addToUserTracks(userId, currentTrackId);
    } else if (currentIndex === playlist.length - 1) {
      const currentTrackId = playlist[currentIndex].id;
      await addToUserTracks(userId, currentTrackId);
      setSwipeEnd(true);
    }
  };

  const handleClosePopup = () => {
    setShowSearchPopup(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  return (
    <div>
      {loading ? ( // Afficher le chargement si les musiques sont en cours de chargement
        <div>Chargement...</div>
      ) : currentTrackInfo && !swipeEnd ? (
        <div>
          {!showSearchPopup && (
            <div
              style={{
                position: "fixed",
                top: "10px",
                right: "10px",

                zIndex: "999999",
              }}>
              {isMuted ? (
                <VolumeOffIcon onClick={toggleMute} />
              ) : (
                <VolumeUpIcon onClick={toggleMute} />
              )}
            </div>
          )}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}>
            {/* Affichage de l'icône de volume en fonction de l'état mute */}

            {currentTrackInfo.album.images.length > 0 && (
              <img
                src={currentTrackInfo.album.images[0].url}
                alt="album"
                style={{ maxWidth: "300px" }}
              />
            )}
            <p style={{ fontWeight: "bold", margin: "10px" }}>
              {currentTrackInfo.artists[0].name}
            </p>
            <p style={{ margin: "0" }}>{currentTrackInfo.name}</p>
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}>
              {/* Intégration de la preview audio */}
              {currentTrackInfo.preview_url && !isMuted && (
                <audio
                  controls
                  id="audioPreview"
                  src={currentTrackInfo.preview_url}
                  muted={isMuted ? "muted" : ""}
                  style={{
                    width: "200px",
                    backgroundColor: "transparent",
                    borderRadius: "10px",
                    boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)", // Ajoute une ombre subtile
                  }}
                />
              )}
              {!currentTrackInfo.preview_url && !isMuted && (
                <p>Aucun audio disponible</p>
              )}
            </div>

            {/* Fin de l'intégration de la preview audio */}
            <div className="tripleButton">
              <button
                onClick={prevTrack}
                style={{ color: "red", border: "red solid 2px" }}>
                <CloseIcon />
              </button>
              <button onClick={() => setShowSearchPopup(true)}>
                <PlaylistAddCheckIcon />
              </button>
              <button
                onClick={nextTrack}
                style={{ color: "#1db954", border: "#1db954 solid 2px" }}>
                <FavoriteIcon />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          Aucun son disponible
          <div className="tripleButton">
            <button onClick={() => setShowSearchPopup(true)}>
              <PlaylistAddCheckIcon />
            </button>
          </div>
        </div> // Afficher un message si aucun son n'est disponible
      )}
      {showSearchPopup && (
        <div className="search-popup">
          <h3>
            Ajout(s) restant(s) : {remainingAdds}/{limiteAjout}
          </h3>
          {remainingAdds > 0 && (
            <form onSubmit={handleSearch}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Recherche une chanson"
              />
              <button type="submit">Rechercher</button>
            </form>
          )}
          <div>
            {searchResults.length > 0 && (
              <div>
                {errorMessage && <div>{errorMessage}</div>}
                <div className="search-results-container">
                  {searchResults.map((track, index) => (
                    <div key={track.id} className="search-result">
                      <img
                        src={track.album.images[0].url}
                        alt="Couverture de l'album"
                        className="search-result-image"
                      />
                      <div className="search-result-details">
                        <p style={{ fontWeight: "bold" }}>{track.name}</p>
                        <p>
                          {track.artists
                            .map((artist) => artist.name)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="buttonAdd">
                        {" "}
                        {/* Utilise className au lieu de class */}
                        <button
                          onClick={() => addTrackToEventPlaylist(track.id)}>
                          <AddCircleIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {remainingAdds <= 0 && (
            <div style={{ position: "fixed", top: "50%" }}>
              Vous ne pouvez plus ajouter de son.
            </div>
          )}
          <button
            onClick={handleClosePopup}
            style={{
              position: "fixed",
              bottom: "0",
              margin: "0",
              borderRadius: "0",
            }}>
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
export default Swipe;
