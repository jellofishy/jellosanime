// App decides which page to show based on the web address.
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Browse from "./pages/Browse.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          {/* The detail page (/anime/:id) is added in step 2 */}
        </Routes>
      </main>
      <Footer />
    </>
  );
}
