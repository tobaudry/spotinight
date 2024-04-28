import React, { useState, useEffect } from "react";
import { getUserData, isLogged } from "../Spotify";
import { database } from "../firebase-config";
import { ref, get, set } from "firebase/database";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import Swipe from "./Swipe";
import axios from "axios";

function Event() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days] = useState(0);
  const [playlistCreated, setPlaylistCreated] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const loggedIn = isLogged();
      if (!loggedIn) {
        navigate("/");
      } else {
        const userData = await getUserData();
        setUser(userData);
        if (userData) {
          // Move checkEventParticipation inside the useEffect callback
          const checkEventParticipation = async (userId) => {
            try {
              const userRef = ref(
                database,
                `events/${eventId}/users/${userId}`
              );
              const userSnapshot = await get(userRef);

              if (userSnapshot.exists()) {
              } else {
                setShowPopup(true);
              }
            } catch (error) {
              console.error("Erreur :", error);
            }
          };

          checkEventParticipation(userData.id);
        }
        await fetchEventData(eventId);
      }
    };

    fetchData();
  }, [navigate, eventId]); // Remove checkEventParticipation from dependencies

  useEffect(() => {
    if (eventData) {
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
      const now = new Date();
      console.log(eventDateTime);
      console.log(now);

      if (eventDateTime > now) {
        console.log("je suis dedans");
        const intervalId = setInterval(() => {
          const now = new Date();
          const timeRemaining = eventDateTime.getTime() - now.getTime();
          setCountdown(timeRemaining);
        }, 1000);

        return () => clearInterval(intervalId);
      } else {
        console.log("je suis dans le else");
        setCountdown(0);
      }
    }
  }, [eventData]);

  useEffect(() => {
    const checkPlaylistCreated = async () => {
      if (eventData && eventData.playlistId) {
        const playlistRef = ref(
          database,
          `playlists/${eventData.playlistId}/created`
        );
        try {
          const playlistSnapshot = await get(playlistRef);
          const created = playlistSnapshot.val();
          if (created) {
            setPlaylistCreated(true);
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du statut de création de la playlist depuis Firebase :",
            error
          );
        }
      }
    };

    checkPlaylistCreated();
  }, [eventData]);

  const fetchEventData = async (eventId) => {
    try {
      const eventRef = ref(database, `events/${eventId}`);
      const eventSnapshot = await get(eventRef);
      if (eventSnapshot.exists()) {
        const eventData = eventSnapshot.val();
        setEventData(eventData);
        if (eventData.url) {
          setPlaylistUrl(eventData.url); // Mettre à jour l'état avec le lien de la playlist
        }
      } else {
        console.log("Event non trouvé");
      }
    } catch (error) {
      console.error("Erreur :", error);
    }
    setLoading(false);
  };

  const participateEvent = async () => {
    try {
      const userId = user.id;
      const userRef = ref(database, `events/${eventId}/users/${userId}`);
      await set(userRef, true);

      const eventRef = ref(database, `events/${eventId}`);
      const eventSnapshot = await get(eventRef);
      const eventData = eventSnapshot.val();

      const updatedEventData = {
        ...eventData,
        users: {
          ...eventData.users,
          [userId]: {
            songsAdded: 0,
          },
        },
      };

      await set(eventRef, updatedEventData);
      setShowPopup(false);
    } catch (error) {
      console.error("Erreur :", error);
    }
  };

  const cancelParticipation = () => {
    navigate("/");
  };

  const formatTimeRemaining = (timeRemaining) => {
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    const seconds = Math.floor((timeRemaining / 1000) % 60);

    if (days > 0) {
      return `${days}j,${hours.toString().padStart(2, "0")}h,${minutes
        .toString()
        .padStart(2, "0")}m,${seconds.toString().padStart(2, "0")}s`;
    } else {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  };

  const createPlaylist = () => {
    // Référence à la playlist correspondant à l'événement
    const playlistRef = ref(
      database,
      `playlists/${eventData.playlistId}/tracks`
    );

    // Récupérer les pistes de la playlist
    get(playlistRef)
      .then((snapshot) => {
        const tracks = snapshot.val();

        // Trier les pistes en fonction du nombre de likes de chaque piste, en ordre décroissant
        const sortedTracks = Object.values(tracks).sort(
          (a, b) => b.like - a.like
        );

        // Créer un objet avec les ID des pistes comme clés
        const sortedTracksObject = {};
        sortedTracks.forEach((track) => {
          sortedTracksObject[track.id] = track;
        });

        // Mettre à jour la base de données avec les pistes triées
        set(playlistRef, sortedTracksObject)
          .then(() => {
            console.log("Playlist triée avec succès !");

            // Ajouter la propriété created à true dans la référence de la playlist dans Firebase
            set(
              ref(database, `playlists/${eventData.playlistId}/created`),
              true
            )
              .then(() => {
                console.log(
                  "Statut de création mis à jour avec succès dans Firebase."
                );
              })
              .catch((error) => {
                console.error(
                  "Erreur lors de la mise à jour du statut de création dans Firebase :",
                  error
                );
              });

            // Créer la playlist sur Spotify
            const accessToken = localStorage.getItem("access_token");
            const userId = user.id;
            const playlistName = eventData.title;
            const trackIds = Object.keys(sortedTracksObject);
            console.log("token", accessToken);
            console.log("userId", userId);
            console.log("playlistName", playlistName);
            console.log("trackIds", trackIds);
            createSpotifyPlaylist(accessToken, userId, playlistName, trackIds);
          })
          .catch((error) => {
            console.error(
              "Erreur lors de la mise à jour de la playlist :",
              error
            );
          });
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération de la playlist depuis Firebase :",
          error
        );
      });
  };

  const createSpotifyPlaylist = async (
    accessToken,
    userId,
    playlistName,
    trackIds
  ) => {
    try {
      // Créer la playlist sur Spotify
      const createPlaylistResponse = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          name: playlistName,
          public: true, // Vous pouvez ajuster cela selon vos préférences de confidentialité
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const playlistId = createPlaylistResponse.data.id;

      // Récupérer le lien de la playlist Spotify
      const playlistUrl = createPlaylistResponse.data.external_urls.spotify;

      // Ajouter les pistes à la playlist sur Spotify
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: trackIds.map((id) => `spotify:track:${id}`) },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Récupérer les données actuelles de la référence de la playlist dans Firebase
      const playlistRef = ref(database, `events/${eventId}`);
      const playlistSnapshot = await get(playlistRef);
      const currentPlaylistData = playlistSnapshot.val();

      // Mettre à jour les données avec l'URL de la nouvelle playlist Spotify
      await set(playlistRef, {
        ...currentPlaylistData,
        url: playlistUrl,
      });
      window.location.reload();
      console.log("Playlist Spotify créée avec succès !");
      console.log(`Vous pouvez la trouver ici : ${playlistUrl}`);
    } catch (error) {
      console.error(
        "Erreur lors de la création de la playlist Spotify :",
        error
      );
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {eventData && (
            <div>
              {countdown !== null && countdown > 0 ? (
                <div>
                  <div
                    style={{
                      position: "fixed",
                      left: "10px",
                      top: "15px",
                    }}
                    onClick={() => navigate("/")} // Redirige vers la page d'accueil
                  >
                    <ArrowBackIosNewIcon />
                  </div>
                  <div
                    style={{
                      position: "fixed",
                      top: "10%",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}>
                    <h2
                      style={{ fontSize: "35px", margin: "0px 0px 10px 0px" }}>
                      {eventData.title}
                    </h2>

                    <p style={{ margin: "0" }}>Temps restant : </p>
                    <p style={{ margin: "0" }}>
                      {days > 0 ? `${days}j et ` : ""}
                      {formatTimeRemaining(countdown)}
                    </p>
                  </div>
                  {showPopup && (
                    <div
                      className="popup"
                      style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}>
                      <h3>Souhaites-tu participer à l'événement ?</h3>
                      <button onClick={participateEvent}>Je participe</button>
                      <button onClick={cancelParticipation}>
                        Je ne participe pas
                      </button>
                    </div>
                  )}
                  {!showPopup && (
                    <div className="swipe">
                      <Swipe eventId={eventId} />
                    </div>
                  )}
                  <img
                    src="https://firebasestorage.googleapis.com/v0/b/spotinight-13b75.appspot.com/o/logo2Black.png?alt=media&token=25439665-db8c-441f-b09e-267bee68e791"
                    style={{
                      position: "fixed",
                      bottom: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                    alt="logo"
                  />
                </div>
              ) : (
                <div>
                  <p>L'événement est terminé</p>
                  {console.log("creator id", eventData.creator[user.id]?.id)}
                  {console.log("user id", user.id)}
                  {console.log("event playlist id", eventData.playlistId)}
                  {playlistCreated ? (
                    <p>
                      Playlist créée ! Vous pouvez la trouver ici :{" "}
                      <a
                        href={playlistUrl}
                        target="_blank"
                        rel="noopener noreferrer">
                        lien de la playlist
                      </a>
                    </p>
                  ) : (
                    <button onClick={createPlaylist}>
                      Appuyez ici pour créer la playlist
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Event;
