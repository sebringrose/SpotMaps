import { render } from 'https://cdn.skypack.dev/preact';
// import { useState } from 'https://cdn.skypack.dev/preact-hooks';
import { html } from 'https://cdn.skypack.dev/htm/preact';

import { Menu } from "./menu.js"

// VANILLA TRAY EXPANDER STUFF
const tray = document.querySelector("#tray")
const handle = document.querySelector("#tray-handle")
handle.addEventListener("click", () => {
  return window.scroll({
    top: window.scrollY > 0 ? 0 : tray.clientHeight,
    behavior: "smooth"
  })
})

// PREACT TRAY APP STUFF
const trayAppContainer = document.querySelector("#tray-react-app")
const TrayApp = ({ data }) => {
  const title = "Select a Spot..."
  
  return html`
    <${Menu} data=${data}/>
  `
}

export const renderTray = (data) => {
  render(html`<${TrayApp} data=${data} />`, trayAppContainer);
}
renderTray({})