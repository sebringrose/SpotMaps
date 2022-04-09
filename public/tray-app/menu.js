import { html } from 'https://cdn.skypack.dev/htm/preact';
import { useState, useEffect } from 'https://cdn.skypack.dev/preact/hooks';

import { AuthBox } from "./auth.js"

export const Menu = ({ data }) => {
  const [active, setActive] = useState(null);
  const [displayContent, setDisplayContent] = useState("");
  const toggleActive = (x) => active === x
    ? setActive(null)
    : setActive(x);
  
  useEffect(() => {
    switch (active) {
      case "links":
        setDisplayContent(html`
          <ul style="width: 100%; padding: 10px;">
            <li>Poopy</li>
            <li>McPoopy</li>
          </ul>
        `) 
        break;
      case "profile":
        setDisplayContent(html`<${AuthBox} />`) 
        break;
      default:
        setDisplayContent("")
        break;
    }
  }, [active, setDisplayContent])
  
  return html`
    <div class="container menu-row" style="padding-bottom: 0;">
      <h2 style="margin-left: 10px; flex: 1;">${data.id || "Select a Spot..."}</h2>
      
      <button class="menu-button hamburger hamburger--spring ${active === "links" ? "is-active" : ""}" type="button" onclick="${() => toggleActive("links")}">
        <span class="hamburger-box">
          <span class="hamburger-inner"></span>
        </span>
      </button>
      
      <button class="menu-button ${active === "profile" ? "is-active" : ""}" type="button" onclick="${() => toggleActive("profile")}">
        <img class="menu-icon" src="https://cdn.glitch.global/735a58cd-72d8-4d68-90f2-960ab8b44c89/user-circle-solid.svg?v=1649345462687" alt="user-profile" />
      </button>  
    </div>
    
    <div id="menu-content" class="${active ? "is-active" : ""}">
        ${displayContent}
    </div>
  `
}
