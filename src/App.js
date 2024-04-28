import React, { useState } from "react";
import Accueil from "./Pages/Accueil";
import Event from "./Pages/Event";
import Swipe from "./Pages/Swipe";
import CreateEvent from "./Pages/CreateEvent";
import "./App.css"; // Assurez-vous d'avoir un fichier App.css dans le même répertoire
import { CounterContext } from "./CounterContext";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

export function CounterContextProvider({ children }) {
  const [counter, setCounter] = useState(0);
  return (
    <CounterContext.Provider
      value={{
        counter,
        increment() {
          setCounter(counter + 1);
        },
      }}>
      {children}
    </CounterContext.Provider>
  );
}

function App() {
  return (
    <CounterContextProvider>
      <div className="app">
        <Router>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/swipe" element={<Swipe />} />
            <Route path="/event/:eventId" element={<Event />} />
            <Route path="/createevent" element={<CreateEvent />} />
          </Routes>
        </Router>
      </div>
    </CounterContextProvider>
  );
}

export default App;
