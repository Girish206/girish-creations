import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function MainLayout() {
  // style.css sets #page-content { display: none } and the original app relied
  // on jQuery's $('#page-content').fadeIn(0) (in main.html's inline script) to
  // reveal it on load. There's no jQuery here, so override it directly.
  return (
    <div id="page-content" style={{ display: "block" }}>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
