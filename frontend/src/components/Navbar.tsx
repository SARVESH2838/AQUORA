import {
  useEffect,
  useState,
} from "react";

import {
  Bell,
  FileText,
  Globe2,
  LogOut,
  MessageSquareText,
  UserCircle2,
} from "lucide-react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import CoordinateSearch
  from "./CoordinateSearch";

import {
  clearAuthSession,
  getAuthEventName,
  getStoredUser,
} from "../services/authApi";

import type {
  AuthUser,
} from "../services/authApi";


interface LocationPoint {
  latitude: number;
  longitude: number;
}


interface NavbarProps {
  onSearch:
    (
      location:
        LocationPoint
    ) => void;

  selectedLocation:
    LocationPoint | null;

  showSearch?: boolean;
}


function Navbar({
  onSearch,
  selectedLocation,
  showSearch = true,
}: NavbarProps) {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      () =>
        getStoredUser()
    );


  /* =========================================================
     REFRESH AUTH STATE
  ========================================================= */

  const refreshAuthState =
    () => {

      const storedUser =
        getStoredUser();

      setUser(
        storedUser
      );

    };


  /* =========================================================
     LISTEN FOR LOGIN / LOGOUT
  ========================================================= */

  useEffect(() => {

    const eventName =
      getAuthEventName();


    window.addEventListener(
      eventName,
      refreshAuthState
    );


    window.addEventListener(
      "storage",
      refreshAuthState
    );


    return () => {

      window.removeEventListener(
        eventName,
        refreshAuthState
      );


      window.removeEventListener(
        "storage",
        refreshAuthState
      );

    };

  }, []);


  /* =========================================================
     IMPORTANT:
     CHECK AUTH AGAIN WHEN ROUTE CHANGES
  ========================================================= */

  useEffect(() => {

    refreshAuthState();

  }, [
    location.pathname
  ]);


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    () => {

      clearAuthSession();

      setUser(null);

      navigate("/");

    };


  /* =========================================================
     USER DISPLAY NAME
  ========================================================= */

  const firstName =
    user?.fullName
      ?.trim()
      .split(" ")[0] ??
    "";


  return (

    <header className="navbar">


      {/* =====================================================
          LEFT
      ===================================================== */}

      <div className="navbar-left">


        <NavLink
          to="/"
          className="navbar-brand"
        >

          <div className="brand-icon">

            <Globe2
              size={24}
            />

          </div>


          <div className="brand-text">

            <strong>
              AQUORA
            </strong>

            <span>
              Ocean Intelligence
            </span>

          </div>

        </NavLink>


        <nav className="navbar-navigation">


          <NavLink
            to="/"
            end
            className={
              ({
                isActive,
              }) =>
                isActive

                  ? "navbar-nav-link active"

                  : "navbar-nav-link"
            }
          >

            <Globe2
              size={15}
            />

            Explore

          </NavLink>


          <NavLink
            to="/reports"
            className={
              ({
                isActive,
              }) =>
                isActive

                  ? "navbar-nav-link active"

                  : "navbar-nav-link"
            }
          >

            <FileText
              size={15}
            />

            Reports

          </NavLink>


          <div
            className=
              "navbar-nav-link coming-soon"
          >

            <MessageSquareText
              size={15}
            />

            Coming Soon

          </div>


        </nav>

      </div>


      {/* =====================================================
          SEARCH
      ===================================================== */}

      {showSearch && (

        <div className="navbar-search">

          <CoordinateSearch
            onSearch={
              onSearch
            }
            selectedLocation={
              selectedLocation
            }
          />

        </div>

      )}


      {/* =====================================================
          RIGHT SIDE
      ===================================================== */}

      <div className="navbar-actions">


        <button
          type="button"
          className=
            "navbar-icon-button"
          aria-label=
            "Notifications"
        >

          <Bell
            size={18}
          />

        </button>


        {/* ===================================================
            AUTHENTICATED USER
        =================================================== */}

        {user ? (

          <>


            <div className="navbar-user">


              <UserCircle2
                size={20}
              />


              <div className="navbar-user-info">


                <strong>

                  {
                    firstName ||
                    "User"
                  }

                </strong>


                <span
                  className={
                    user
                      .verificationStatus ===
                    "VERIFIED"

                      ? "verification verified"

                      : "verification unverified"
                  }
                >

                  {
                    user
                      .verificationStatus ===
                    "VERIFIED"

                      ? "Verified"

                      : "Unverified"
                  }

                </span>


              </div>


            </div>


            <button
              type="button"
              className="navbar-logout"
              onClick={
                handleLogout
              }
              title="Sign out"
              aria-label="Sign out"
            >

              <LogOut
                size={17}
              />

            </button>


          </>

        ) : (

          /* =================================================
             NOT AUTHENTICATED
          ================================================= */

          <NavLink
            to="/login"
            className="navbar-profile"
          >

            <UserCircle2
              size={19}
            />

            <span>
              Sign in
            </span>

          </NavLink>

        )}


      </div>


    </header>

  );

}


export default Navbar;