import React, { useState, useEffect } from "react";
import { ref, push, set } from "firebase/database";
import { database } from "../firebase-config";
import axios from "axios";
import { currentToken } from "../Spotify";
import { useNavigate } from "react-router-dom";
import "../css/CreateEvent.css";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

const playlistIds = {
  top50France: "37i9dQZEVXbIPWwFssbupI",
  top50Monde: "37i9dQZEVXbMDoHDwVN2tF",
  top50RapFrancais: "211vzYG60PkPrlADj0g3sR",
  top50Rock: "37i9dQZF1DWWSuZL7uNdVA",
  topHitsDuMoment: "0h3Xy4V4apMraB5NuM8U7Z",
  top50Metal: "37i9dQZF1DX06ea0x0qwKU",
  top50RnB: "37i9dQZF1DX2LoIIQLAhdb",
  top50Reggaeton: "37i9dQZF1DWY7IeIP1cdjF",
  top50Techno: "6MJSGcF4iV79gyo8xZpd8U",
  top50Electro: "37i9dQZF1DX5wB72P2sVsT",
};

function CreateEvent() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [musicStyle, setMusicStyle] = useState("top50France");
  const [limiteAjout, setLimiteAjout] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.log(
        "L'utilisateur n'est pas connecté. Redirection vers la page d'accueil."
      );
      navigate("/");
    }
  }, [navigate]);

  const validateInput = () => {
    const newErrors = {};
    const currentDate = new Date().toISOString().split("T")[0];
    if (!title.match(/^[a-zA-Z0-9 ]+$/)) {
      newErrors.title =
        "Le titre doit contenir uniquement des lettres et des chiffres.";
    }
    if (date < currentDate) {
      newErrors.date = "La date ne peut pas être dans le passé.";
    }
    if (isNaN(limiteAjout) || limiteAjout < 1) {
      newErrors.limiteAjout = "La limite d'ajout doit être un nombre positif.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateInput()) {
      console.log("Validation failed:", errors);
      return;
    }

    const eventId = await createEventInFirebase(
      title,
      date,
      time,
      musicStyle,
      limiteAjout
    );

    if (eventId) {
      navigate(`/event/${eventId}`);
    }
  };

  async function createEventInFirebase(
    title,
    date,
    time,
    musicStyle,
    limiteAjout
  ) {
    console.log(musicStyle);
    const eventRef = ref(database, "events");
    const newEventRef = push(eventRef);

    const userId = localStorage.getItem("userId");

    const newPlaylistId = await createPlaylistInFirebase(
      musicStyle,
      newEventRef.key
    );

    const creator = {
      id: userId,
    };

    const eventData = {
      title: title,
      date: date,
      time: time,
      style: musicStyle,
      basePlaylistId: playlistIds[musicStyle],
      playlistId: newPlaylistId,
      limiteAjout: limiteAjout,
      creator: {
        [userId]: creator,
      },
    };

    await set(newEventRef, eventData);
    const createdEventId = newEventRef.key;
    return createdEventId;
  }
  async function createPlaylistInFirebase(musicStyle, eventId) {
    const eventPlaylistRef = ref(database, `playlists/${eventId}/tracks`);

    const spotifyPlaylistTracks = await fetchSpotifyPlaylistTracks(
      playlistIds[musicStyle]
    );

    const playlistData = {};

    // Ajoute l'attribut "like" avec une valeur initiale de 0 à chaque piste
    spotifyPlaylistTracks.slice(0, 50).forEach((track) => {
      playlistData[track.id] = { id: track.id, like: 0 };
    });

    await set(eventPlaylistRef, playlistData);

    return eventId; // Retourne simplement l'ID de l'événement
  }

  async function fetchSpotifyPlaylistTracks(playlistId) {
    console.log(playlistId);
    const accessToken = currentToken.access_token;
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items.map((item) => item.track);
  }

  return (
    <div>
      <div
        style={{ position: "fixed", left: "10px", top: "15px" }}
        onClick={() => navigate("/")}>
        <ArrowBackIosNewIcon />
      </div>
      <img
        src="https://firebasestorage.googleapis.com/v0/b/spotinight-13b75.appspot.com/o/logo2Black.png?alt=media&token=25439665-db8c-441f-b09e-267bee68e791"
        style={{
          position: "fixed",
          top: "100px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
        alt="logo"
      />
      <form
        onSubmit={handleSubmit}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}>
        <input
          type="text"
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {errors.title && <div className="error">{errors.title}</div>}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {errors.date && <div className="error">{errors.date}</div>}
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <select
          value={musicStyle}
          onChange={(e) => setMusicStyle(e.target.value)}>
          <option value="top50France">Top 50 France</option>
          <option value="top50Monde">Top 50 Monde</option>
          <option value="top50RapFrancais">Top 50 Rap français</option>
          <option value="top50Rock">Top 50 Rock</option>
          <option value="topHitsDuMoment">Top Hits Du Moment</option>
          <option value="top50Metal">Top 50 Metal</option>
          <option value="top50RnB">Top 50 RnB</option>
          <option value="top50Reggaeton">Top 50 Reggaeton</option>
          <option value="top50Techno">Top 50 Techno</option>
          <option value="top50Electro">Top 50 Electro</option>
        </select>

        <input
          type="number"
          placeholder="Limite d'ajout de musiques"
          value={limiteAjout}
          onChange={(e) => setLimiteAjout(e.target.value)}
        />
        {errors.limiteAjout && (
          <div className="error">{errors.limiteAjout}</div>
        )}
        <button type="submit">Créer l'événement</button>
      </form>
    </div>
  );
}

export default CreateEvent;
