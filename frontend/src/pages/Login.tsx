import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  LockKeyhole,
  LogIn,
  Mail,
  Waves,
} from "lucide-react";

import Navbar
  from "../components/Navbar";

import {
  loginUser,
  saveAuthSession,
} from "../services/authApi";


function Login() {

  const navigate =
    useNavigate();


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  const handleSubmit =
    async (
      event:
        React.FormEvent
    ) => {

      event.preventDefault();

      setError(null);

      setLoading(true);

      try {

        const response =
          await loginUser({
            email,
            password,
          });

        saveAuthSession(
          response
        );

        navigate("/");

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Unable to sign in."
        );

      } finally {

        setLoading(false);

      }

    };


  return (

    <div className="app-shell">

      <Navbar
        onSearch={() => {}}
        selectedLocation={null}
        showSearch={false}
      />


      <main className="auth-page">

        <div className="auth-card">

          <div className="auth-icon">
            <Waves size={28} />
          </div>


          <span className="auth-eyebrow">
            AQUORA ACCOUNT
          </span>


          <h1>
            Welcome back
          </h1>


          <p className="auth-description">

            Sign in to access your
            AQUORA identity and
            persistent research workflow.

          </p>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >

            <label>

              Email Address

              <div className="auth-input">

                <Mail size={17} />

                <input
                  type="email"
                  required
                  value={email}
                  placeholder="you@institution.edu"
                  onChange={
                    (event) =>
                      setEmail(
                        event.target.value
                      )
                  }
                />

              </div>

            </label>


            <label>

              Password

              <div className="auth-input">

                <LockKeyhole
                  size={17}
                />

                <input
                  type="password"
                  required
                  value={password}
                  placeholder="Enter password"
                  onChange={
                    (event) =>
                      setPassword(
                        event.target.value
                      )
                  }
                />

              </div>

            </label>


            {error && (

              <div className="auth-error">
                {error}
              </div>

            )}


            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >

              <LogIn size={17} />

              {
                loading
                  ? "Signing in..."
                  : "Sign In"
              }

            </button>

          </form>


          <div className="auth-footer">

            New to AQUORA?

            {" "}

            <Link to="/register">
              Create an account
            </Link>

          </div>

        </div>

      </main>

    </div>

  );
}


export default Login;