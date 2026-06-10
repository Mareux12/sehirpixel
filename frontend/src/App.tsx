import { BrowserRouter, Routes, Route } from "react-router-dom";
import Game from "./Game";

function Callback() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#060B18] text-white">
      Google login tamamlandi...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/auth/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
}