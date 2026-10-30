import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { enforceBergrentacarHost } from './security/site-lock'
import './index.css'
import './styles/google-places-autocomplete.css'

await enforceBergrentacarHost()

createRoot(document.getElementById("root")!).render(<App />);
