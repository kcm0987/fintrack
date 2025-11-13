import { Amplify } from "aws-amplify"
import { Authenticator, withAuthenticator } from "@aws-amplify/ui-react"
import "@aws-amplify/ui-react/styles.css"
import awsExports from "./aws-exports"
import Dashboard from "./pages/Dashboard"

Amplify.configure(awsExports)

function App() {
  return (
    <div className="App">
      <Authenticator>
        {({ signOut, user }) => {
          // Extract email from signInDetails.loginId
          const userEmail = user?.signInDetails?.loginId || user?.attributes?.email || ""
          const userName = user?.attributes?.name || user?.attributes?.given_name || userEmail.split("@")[0] || "User"

          

          return (
            <main>
              {/* Pass user data and signOut function to Dashboard */}
              <Dashboard userEmail={userEmail} userName={userName} onSignOut={signOut} />
            </main>
          )
        }}
      </Authenticator>
    </div>
  )
}

export default withAuthenticator(App)
