import { html } from 'https://cdn.skypack.dev/htm/preact';
import { useState, useEffect } from 'https://cdn.skypack.dev/preact/hooks';

// get previous authEmail and authToken from localStorage
let authEmail = localStorage.getItem("auth-email")
let authToken = localStorage.getItem("auth-token")

export const AuthBox = () => {
  const [email, setEmail] = useState(authEmail)
  const [token, setToken] = useState(authToken)
  const [code, setCode] = useState()
  const [codeEntry, setCodeEntry] = useState(false)
  
  const sendCodeToEmail = async () => {
    const response = await fetch("/postEmail", {
      method: "POST",
      body: JSON.stringify({ email })
    })
    
    if (response.status !== 200) {
      return alert("Error sending code to your email address. Please contact admin to resolve this issue.")
    }
    
    localStorage.setItem("auth-email", email)
    setCodeEntry(true)
  }
  
  const submitCode = async () => {
    const response = await fetch("/postCode", {
      method: "POST",
      body: JSON.stringify({ email, code })
    })
    
    if (response.status !== 200) {
      return alert("Error validating code or email address. Please contact admin to resolve this issue.")
    }
    
    const json = await response.json()
    localStorage.setItem("auth-token", json.token)
    setToken(json.token)
  }
  
  const logout = () => {
    setCodeEntry(false)
    localStorage.removeItem("auth-token")
    setToken("")
  }
  
  useEffect(() => {
    // validate token if exists and remove if invalid
    if (email && token) {
      setCodeEntry(false)
      
      const response = fetch("/authMe", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: new Headers({
          'Authorization': `Bearer ${token}`
        })
      })
        .then((response) => {
          if (response.status !== 200) {
            return logout()
          }
        })
    }
  }, [email, token])
  
  if (email && token) return html`
    <button onclick=${logout}>
      Sign out
    </button>
  `
  
  return html`
    <div id="auth-box">
      <h3>Sign In</h3>
      <p>Upload clips, create spots & more!</p>
      
      ${!codeEntry 
        ? html`<label for="email">Email:</label>
          <br />
          <input name="email" type="email" value=${email} onchange=${(e) => setEmail(e.target.value)}/>
          <br />
          <button id="auth-button" onclick=${sendCodeToEmail}>Get Code</button>
        `
        : html`
          <strong>An Access Code has been sent to your email address.</strong>
          <br /><br />
          <label for="code">Enter Access Code:</label>
          <br />
          <input name="code" type="number" min="1000" max="9999" value=${code} onchange=${(e) => setCode(e.target.value)}/>
          <br />
          <button id="auth-button" onclick=${submitCode}>Submit Code</button>
        `
      }
    </div>
  `
}