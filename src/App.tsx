import { BrowserRouter } from "react-router-dom";
import "./styles/App.css";
import "./styles/AuthScreen.css";
import "./styles/MenuChrome.css";
import "./styles/StartScreen.css";
import "./styles/RankingScreen.css";
import "./styles/AutoUndoFlash.css";
import { AuthGate } from "./app/index";

function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}

export default App;
