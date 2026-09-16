import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { icons, Search } from "lucide-react";
import { svgData, type DesignObject, baseObject } from "./model";
const names = Object.keys(icons) as (keyof typeof icons)[];
export default function IconLibrary({
  add,
}: {
  add: (o: DesignObject) => void;
}) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const results = names.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="search-field">
        <Search size={15} />
        <input
          placeholder="Search 1,500+ icons…"
          aria-label="Search icons"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(100);
          }}
        />
      </div>
      <div className="icon-library">
        {results.slice(0, limit).map((name) => {
          const Icon = icons[name];
          return (
            <button
              key={name}
              title={name}
              aria-label={"Add " + name + " icon"}
              onClick={() =>
                add(
                  baseObject("icon", {
                    name: String(name),
                    width: 180,
                    height: 180,
                    src: svgData(
                      renderToStaticMarkup(
                        <Icon size={128} color="#254e3b" strokeWidth={1.6} />,
                      ),
                    ),
                  }),
                )
              }
            >
              <Icon size={24} />
            </button>
          );
        })}
      </div>
      {results.length === 0 && (
        <p className="empty-state">No icons found. Try “heart” or “home”.</p>
      )}
      {results.length > limit && (
        <button
          className="secondary full"
          onClick={() => setLimit((l) => l + 100)}
        >
          Show more icons
        </button>
      )}
      <p className="field-note">
        {results.length.toLocaleString()} open-source Lucide icons
      </p>
    </>
  );
}
