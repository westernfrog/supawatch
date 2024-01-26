import Search from "./components/Search";

export default function SearchLayout({ children }) {
  return (
    <section>
      <Search />
      {children}
    </section>
  );
}
