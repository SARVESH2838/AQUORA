import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  Building2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
  Waves,
} from "lucide-react";

import Navbar
  from "../components/Navbar";

import {
  registerUser,
  saveAuthSession,
} from "../services/authApi";


function Register() {

  const navigate =
    useNavigate();


  const [
    fullName,
    setFullName,
  ] = useState("");


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    institution,
    setInstitution,
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


      if (
        password.length < 8
      ) {

        setError(
          "Password must contain at least 8 characters."
        );

        return;
      }


      setLoading(true);


      try {

        const response =
          await registerUser({
            fullName,
            email,
            institution,
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
            : "Unable to create account."
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


        <div className="auth-card auth-card-register">


          <div className="auth-icon">

            <Waves size={28} />

          </div>


          <span className="auth-eyebrow">

            JOIN AQUORA

          </span>


          <h1>

            Create your account

          </h1>


          <p className="auth-description">

            Create an AQUORA identity
            for reports, collaboration,
            and future institutional
            workflows.

          </p>


          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >


            {/* =================================================
                FULL NAME
            ================================================= */}

            <label>

              Full Name


              <div className="auth-input">


                <User size={17} />


                <input
                  type="text"
                  required
                  value={
                    fullName
                  }
                  placeholder="Your full name"
                  onChange={
                    (
                      event
                    ) =>
                      setFullName(
                        event.target.value
                      )
                  }
                />


              </div>


            </label>


            {/* =================================================
                EMAIL
            ================================================= */}

            <label>

              Email Address


              <div className="auth-input">


                <Mail size={17} />


                <input
                  type="email"
                  required
                  value={
                    email
                  }
                  placeholder="you@institution.edu"
                  onChange={
                    (
                      event
                    ) =>
                      setEmail(
                        event.target.value
                      )
                  }
                />


              </div>


            </label>


            {/* =================================================
                INSTITUTION
            ================================================= */}

            <label>

              Institution


              <div className="auth-input">


                <Building2
                  size={17}
                />


                <input
                  type="text"
                  required
                  value={
                    institution
                  }
                  placeholder="College / University / Organisation"
                  onChange={
                    (
                      event
                    ) =>
                      setInstitution(
                        event.target.value
                      )
                  }
                />


              </div>


            </label>


            {/* =================================================
                PASSWORD
            ================================================= */}

            <label>

              Password


              <div className="auth-input">


                <LockKeyhole
                  size={17}
                />


                <input
                  type="password"
                  required
                  minLength={8}
                  value={
                    password
                  }
                  placeholder="Minimum 8 characters"
                  onChange={
                    (
                      event
                    ) =>
                      setPassword(
                        event.target.value
                      )
                  }
                />


              </div>


            </label>


            {/* =================================================
                VERIFICATION INFORMATION
            ================================================= */}

            <div className="verification-preview">


              <ShieldCheck
                size={18}
              />


              <div>


                <strong>

                  Institutional Verification

                </strong>


                <span>

                  New prototype accounts
                  begin as Unverified.
                  Institutional identity
                  verification is reserved
                  for the verified-access
                  workflow.

                </span>


              </div>


            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

              <div className="auth-error">

                {error}

              </div>

            )}


            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              className="auth-submit"
              disabled={
                loading
              }
            >


              <UserPlus
                size={17}
              />


              {
                loading
                  ? "Creating account..."
                  : "Create Account"
              }


            </button>


          </form>


          {/* =================================================
              LOGIN LINK
          ================================================= */}

          <div className="auth-footer">


            Already registered?


            {" "}


            <Link to="/login">

              Sign in

            </Link>


          </div>


        </div>


      </main>


    </div>

  );

}


export default Register;