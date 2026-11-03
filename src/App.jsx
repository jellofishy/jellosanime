// App decides which page to show based on the web address.
import { Routes, Route, Link } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Browse from "./pages/Browse.jsx";
import Airing from "./pages/Airing.jsx";
import Genres from "./pages/Genres.jsx";
import Login from "./pages/Login.jsx";
import MyList from "./pages/MyList.jsx";
import Detail from "./pages/Detail.jsx";
import BackToTop from "./components/BackToTop.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import EmptyState from "./components/EmptyState.jsx";
import { Compass } from "lucide-react";

// Shown for any address we don't know.
function NotFound() {
  return (
    <EmptyState icon={Compass} title="We couldn't find that page" text="The link may be mistyped or the page may have moved.">
      <Link to="/" className="btn btn-primary">Go to Home</Link>
    </EmptyState>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container has-bottom-nav">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/airing" element={<Airing />} />
          <Route path="/genres" element={<Genres />} />
          <Route path="/login" element={<Login />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/anime/:id" element={<Detail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
