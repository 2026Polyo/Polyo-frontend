import { BrowserRouter } from "react-router-dom";
import "./styles";
import { AuthGate } from "./app/index";

function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}

export default App;
