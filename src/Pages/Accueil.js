import React, { useState, useEffect } from "react";
import {
  getUserData,
  isLogged,
  loginSpotify,
  logoutSpotify,
  getGlobalTopTracks,
} from "../Spotify";
import { database } from "../firebase-config";
import { ref, set } from "../firebase-config";
import "../App.css";
import "../css/Accueil.css";
import { get } from "firebase/database";
import { Link, useNavigate, useParams } from "react-router-dom";
import { WindowSharp } from "@mui/icons-material";

function Accueil() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [globalTopTracks, setGlobalTopTracks] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      const loggedIn = isLogged();
      if (loggedIn) {
        const userData = await getUserData();
        if (userData && userData.id && userData.display_name) {
          // Vérification des données utilisateur valides
          setUser(userData);
          AddUser(userData);
          localStorage.setItem("userId", userData.id);
          fetchUserEvents(userData.id);
          fetchGlobalTopTracks();
          const userId = userData.id;
          const usersRef = ref(database, `users/${userId}`);
          try {
            const userSnapshot = await get(usersRef);
            if (userSnapshot.exists()) {
              console.log("L'utilisateur est présent dans la base de données.");
            } else {
              console.log(
                "L'utilisateur n'est pas présent dans la base de données."
              );
            }
          } catch (error) {
            console.error(
              "Erreur lors de la vérification de la présence de l'utilisateur dans la base de données :",
              error
            );
          }
        } else {
          // Si les données utilisateur sont invalides, déconnecte l'utilisateur
          // handleLogout();
          console.log("Données non valides ! ");
        }
      }
    };

    fetchData();
  }, []);

  const AddUser = async (userData) => {
    if (userData) {
      const { id, display_name } = userData; // Extraction des données pertinentes de userData
      console.log("id", id);
      console.log("display_name", display_name);

      const usersRef = ref(database, `users/${id}`); // Référence à l'emplacement de l'utilisateur dans la base de données

      try {
        const userSnapshot = await get(usersRef);

        if (!userSnapshot.exists()) {
          // L'utilisateur n'existe pas encore, nous pouvons l'ajouter
          await set(usersRef, {
            username: display_name,
            // Autres données utilisateur si nécessaire
          });
          console.log("Utilisateur ajouté avec succès à la base de données.");

          // Enregistrement de l'ID dans le localStorage
          localStorage.setItem("userId", id);
          console.log(
            "ID de l'utilisateur enregistré dans le localStorage.",
            localStorage.getItem("userId")
          );
        } else {
          console.log("L'utilisateur existe déjà dans la base de données.");
        }
      } catch (error) {
        console.error("Erreur dans l'ajout dans la base de données : ", error);
      }
    }
  };

  const fetchUserEvents = async (userId) => {
    const eventsRef = ref(database, "events");
    const snapshot = await get(eventsRef);
    const eventsData = [];

    snapshot.forEach((childSnapshot) => {
      const eventData = childSnapshot.val();
      if (eventData.users && eventData.users[userId]) {
        eventsData.push({ id: childSnapshot.key, ...eventData });
      }
    });

    setEvents(eventsData);
  };

  const fetchGlobalTopTracks = async () => {
    try {
      const tracksData = await getGlobalTopTracks();
      if (tracksData && tracksData.items) {
        setGlobalTopTracks(tracksData.items);
      }
    } catch (error) {
      console.error("Error fetching global top tracks:", error);
    }
  };

  const handleLogout = () => {
    logoutSpotify();
    setUser(null);
    navigate("/");
    localStorage.removeItem("userId");
  };

  return (
    <div className="app">
      <header className="app-header">
        <img src="https://firebasestorage.googleapis.com/v0/b/spotinight-13b75.appspot.com/o/logo2.png?alt=media&token=4046e15c-1589-471d-8007-c9bf817fac6d" />
        {user ? (
          <p>Bonjour {user.display_name}, content de te revoir !</p>
        ) : (
          <p>Tu n'es pas connecté.</p>
        )}
        <div className="buttons">
          {user ? (
            <>
              <Link to="/createevent">
                <button>Créer un événement</button>
              </Link>
            </>
          ) : (
            <button onClick={loginSpotify}>Se connecter</button>
          )}
        </div>
      </header>
      {user ? (
        <main>
          {events.length > 0 ? (
            <div className="events-list">
              <h2>Mes événements</h2>
              <ul style={{ listStyle: "url('/media/examples/rocket.svg')" }}>
                {events.map((event) => (
                  <li key={event.id}>
                    <Link to={`/event/${event.id}`}>{event.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="global-top-tracks">
              <h2>
                Vous n'avez aucun événement, créez-en un, ou rejoignez-en un
                grâce à un lien d'invitation !
              </h2>
              <h4>En attendant, voici les titres du moment</h4>
              <div className="tracks-container">
                {globalTopTracks.map((item, index) => (
                  <div key={index} className="track">
                    <img
                      src={item.track.album.images[0].url}
                      alt={item.track.name}
                    />
                    <div className="track-info">
                      <h3>{item.track.name}</h3>
                      <p>
                        {item.track.artists
                          .map((artist) => artist.name)
                          .join(", ")}
                      </p>
                      {item.track.preview_url && (
                        <audio controls src={item.track.preview_url}>
                          Aucun audio disponible
                        </audio>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="button-logout">
            Se déconnecter
          </button>
        </main>
      ) : (
        <></>
      )}
    </div>
  );
}

export default Accueil;
