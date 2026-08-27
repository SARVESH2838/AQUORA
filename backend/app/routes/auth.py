from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from pydantic import BaseModel


from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    decode_access_token,
    get_user_by_id,
    is_valid_email,
    serialize_user,
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/auth",
    tags=[
        "Authentication"
    ],
)


# =========================================================
# BEARER TOKEN
# =========================================================

security = HTTPBearer(
    auto_error=False
)


# =========================================================
# REQUEST MODELS
# =========================================================

class RegisterRequest(
    BaseModel
):

    fullName: str

    email: str

    institution: str

    password: str


class LoginRequest(
    BaseModel
):

    email: str

    password: str


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    status_code=
        status.HTTP_201_CREATED,
)
async def register(
    request:
        RegisterRequest,
):

    full_name = (
        request.fullName
        .strip()
    )


    email = (
        request.email
        .strip()
        .lower()
    )


    institution = (
        request.institution
        .strip()
    )


    password = (
        request.password
    )


    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if len(
        full_name
    ) < 2:

        raise HTTPException(
            status_code=400,
            detail=
                "Please enter your full name.",
        )


    if not is_valid_email(
        email
    ):

        raise HTTPException(
            status_code=400,
            detail=
                "Please enter a valid email address.",
        )


    if len(
        institution
    ) < 2:

        raise HTTPException(
            status_code=400,
            detail=
                "Please enter your institution.",
        )


    if len(
        password
    ) < 8:

        raise HTTPException(
            status_code=400,
            detail=
                "Password must contain at least 8 characters.",
        )


    try:

        user = (
            create_user(
                full_name=
                    full_name,

                email=
                    email,

                institution=
                    institution,

                password=
                    password,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=409,
            detail=str(
                exc
            ),
        )


    token = (
        create_access_token(
            user
        )
    )


    return {

        "message":
            "Account created successfully.",

        "accessToken":
            token,

        "tokenType":
            "bearer",

        "user":
            serialize_user(
                user
            ),
    }


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login"
)
async def login(
    request:
        LoginRequest,
):

    user = (
        authenticate_user(
            email=
                request.email,

            password=
                request.password,
        )
    )


    if not user:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=
                "Invalid email or password.",
        )


    token = (
        create_access_token(
            user
        )
    )


    return {

        "message":
            "Login successful.",

        "accessToken":
            token,

        "tokenType":
            "bearer",

        "user":
            serialize_user(
                user
            ),
    }


# =========================================================
# CURRENT USER DEPENDENCY
# =========================================================

def get_current_user(
    credentials:
        HTTPAuthorizationCredentials
        | None
        = Depends(
            security
        ),
):

    if not credentials:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=
                "Authentication required.",
        )


    token = (
        credentials.credentials
    )


    payload = (
        decode_access_token(
            token
        )
    )


    if not payload:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=
                "Invalid or expired authentication token.",
        )


    user_id = (
        payload.get(
            "sub"
        )
    )


    if not user_id:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=
                "Invalid authentication token.",
        )


    user = (
        get_user_by_id(
            user_id
        )
    )


    if not user:

        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=
                "User account no longer exists.",
        )


    return user


# =========================================================
# CURRENT USER
# =========================================================

@router.get(
    "/me"
)
async def current_user(
    user=
        Depends(
            get_current_user
        ),
):

    return {

        "authenticated":
            True,

        "user":
            serialize_user(
                user
            ),
    }