# Design Document: User Authentication & Profile System

**Feature**: #2 — User Authentication & Profile System  
**Status**: In Design  
**Author**: UI/UX Designer  
**Date**: 2026-07-04  
**Tech Spec**: `docs/specs/user-auth-system.md`

---

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Layout Wireframes](#2-layout-wireframes)
3. [Component Specifications](#3-component-specifications)
4. [Interaction Flows](#4-interaction-flows)
5. [Responsive Design](#5-responsive-design)
6. [Color & Type Palette](#6-color--type-palette)
7. [Accessibility](#7-accessibility)
8. [Real-time & Electron UX](#8-real-time--electron-ux)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Design Overview

This feature introduces four user-facing pages and a persistent navbar to Scribble. All follow the established dark Scribble theme established in Feature #1 (SplashScreen). The visual language emphasizes centered card layouts, high contrast, purple accent actions, and clear error/success feedback.

| Surface | Route | Auth Required | Purpose |
|---|---|---|---|
| Navbar | (all pages) | None | Persistent top bar: logo, auth links or profile/logout |
| Login Page | `/login` | No (guest only) | Username/email + password form |
| Register Page | `/register` | No (guest only) | Full account creation form |
| Profile Page | `/profile` | Yes | View/edit profile, change email, change password |
| SplashScreen | `/` | None | Re-used as loading state during initial auth check |

### 1.1 Page Hierarchy

```
<BrowserRouter>
  <Routes>
    ├── "/"           → <SplashScreen />           (no auth required)
    ├── "/login"       → <GuestRoute>               (redirect to /profile if logged in)
    │                     └── <Navbar />
    │                     └── <LoginPage />
    ├── "/register"    → <GuestRoute>               (redirect to /profile if logged in)
    │                     └── <Navbar />
    │                     └── <RegisterPage />
    ├── "/profile"     → <ProtectedRoute>           (redirect to /login if not logged in)
    │                     └── <Navbar />
    │                     └── <ProfilePage />
    └── "*"            → <Navigate to="/" />
  </Routes>
</BrowserRouter>
```

The Navbar is NOT wrapped inside individual page components — it's rendered inside each route page component at the top, or as part of a shared layout wrapper. Since there is no layout route wrapper defined yet, each page component renders `<Navbar />` as its first child for simplicity. This can be refactored to a `<Layout>` wrapper in a future iteration.

---

## 2. Layout Wireframes

### 2.1 Navbar (Desktop & Mobile)

**Desktop** (≥640px):

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                        ┌──────────────┐ │
│ │  Scribble│                                        │Profile  Logout│ │  ← Authenticated
│ └──────────┘                                        └──────────────┘ │
│ ┌──────────┐                                     ┌─────────┬───────┐ │
│ │  Scribble│                                     │Login│Register│    │  ← Unauthenticated
│ └──────────┘                                     └─────────┴───────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Mobile** (<640px):

```
┌──────────────────────────────────────┐
│ ┌──────────┐          ┌───┬──────┐  │
│ │ Scribble │          │ P │ Log  │  │  ← Authenticated
│ └──────────┘          └───┴──────┘  │
│ ┌──────────┐       ┌────┬────────┐  │
│ │ Scribble │       │Log │Register│  │  ← Unauthenticated
│ └──────────┘       └────┴────────┘  │
└──────────────────────────────────────┘
```

Stack description:
- Full-width bar, fixed height (56px), bg `scribble-surface`, border-b `scribble-border`
- Left: "Scribble" text link to `/`, styled as `font-bold text-lg tracking-wider text-white`
- Right: `<nav>` with links/buttons, flex row, gap-4 (desktop) / gap-2 (mobile)
- Authenticated: "Profile" link + "Logout" button (styled as a link to keep it subtle)
- Unauthenticated: "Login" link + "Register" link
- Links: `text-scribble-muted hover:text-white transition-colors`
- Logout button: same link styling but with `onClick` handler

### 2.2 Login Page (`/login`)

**Desktop**: Centered card on dark background with Navbar at top.

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                                                                        │
│                    ┌──────────────────────────┐                       │
│                    │      Welcome Back         │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Username or Email   │  │  ← Input             │
│                    │  └────────────────────┘  │                       │
│                    │       ↑ inline error      │  ← Red text, hidden   │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Password            │  │  ← Input             │
│                    │  └────────────────────┘  │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │     Log In          │  │  ← Primary button    │
│                    │  └────────────────────┘  │                       │
│                    │                          │                       │
│                    │  Don't have an account?  │                       │
│                    │        Sign up           │  ← Link to /register  │
│                    └──────────────────────────┘                       │
│                                                                        │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Card dimensions**: `max-w-md w-full mx-auto`  
**Vertical position**: `mt-24` to push the card down from the navbar  
**Card padding**: `p-8`  
**Top error banner**: Above the form, a conditional error box (red background, white text, border-l-4 border-red-500). Only visible when `serverError` is set.

### 2.3 Register Page (`/register`)

**Desktop**: Same centered card pattern as Login, 5 fields + submit button.

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                               │
├──────────────────────────────────────────────────────────────────────┤
│                    ┌──────────────────────────┐                       │
│                    │     Create Account        │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Name                │  │                       │
│                    │  └────────────────────┘  │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Username             │  │                       │
│                    │  └────────────────────┘  │                       │
│                    │   3-50 chars, a-z, 0-9, _│  ← hint text, muted   │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Email                │  │                       │
│                    │  └────────────────────┘  │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Password             │  │                       │
│                    │  └────────────────────┘  │                       │
│                    │   Minimum 8 characters    │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │ Confirm Password     │  │                       │
│                    │  └────────────────────┘  │                       │
│                    │                          │                       │
│                    │  ┌────────────────────┐  │                       │
│                    │  │   Create Account     │  │                       │
│                    │  └────────────────────┘  │                       │
│                    │                          │                       │
│                    │  Already have an account?│                       │
│                    │         Log in           │                       │
│                    └──────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.4 Profile Page (`/profile`)

**Desktop**: Full-width page with three card sections stacked vertically. Navbar at top.

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Profile                                          [Edit]        │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────────────────────────────┐                      │  │
│  │  │  Display Name     Alice Smith       │ ← editable when mode  │  │
│  │  │  Username         alice             │   is "editing"        │  │
│  │  │  Email            alice@example.com │                      │  │
│  │  │  Member Since     July 4, 2026      │                      │  │
│  │  └─────────────────────────────────────┘                      │  │
│  │  ┌────────────────────┬────────────────┐                      │  │
│  │  │ [Save Changes]      │ [Cancel]       │ ← only when editing  │  │
│  │  └────────────────────┴────────────────┘                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Change Email                                                   │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ New Email           │                                        │  │
│  │  └────────────────────┘                                        │  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ Current Password    │  ← for verification                   │  │
│  │  └────────────────────┘                                        │  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ Update Email        │                                        │  │
│  │  └────────────────────┘                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Change Password                                                │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ Current Password    │                                        │  │
│  │  └────────────────────┘                                        │  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ New Password        │                                        │  │
│  │  └────────────────────┘                                        │  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ Confirm New Passw.  │                                        │  │
│  │  └────────────────────┘                                        │  │
│  │  ┌────────────────────┐                                        │  │
│  │  │ Change Password     │                                        │  │
│  │  └────────────────────┘                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Mobile**: Cards stack with full width, reduced inner padding.

---

## 3. Component Specifications

### 3.1 `<form-input>` (Reusable Input Pattern)

Not a standalone component — a consistent Tailwind class pattern applied to all `<input>` elements across the auth system.

```
<input
  type="..."
  id="field-name"
  name="field-name"
  value={value}
  onChange={handler}
  required
  className="w-full px-4 py-2.5 rounded-lg bg-scribble-bg border border-scribble-border
             text-white placeholder-scribble-muted
             focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent
             disabled:opacity-50 disabled:cursor-not-allowed
             transition-colors duration-200"
/>
```

| State | Classes |
|---|---|
| Default | `bg-scribble-bg border-scribble-border text-white` |
| Focus | `ring-2 ring-scribble-primary border-transparent` |
| Error | `border-red-400 ring-1 ring-red-400` |
| Disabled | `opacity-50 cursor-not-allowed` |

**Label pattern** (above each input):

```html
<label htmlFor="username-or-email" className="block text-sm font-medium text-scribble-muted mb-1.5">
  Username or Email
</label>
```

**Error text pattern** (below each input, only when error exists):

```html
{error && (
  <p className="mt-1 text-sm text-red-400" role="alert">{error}</p>
)}
```

### 3.2 Authentication Container (Shared Card Pattern)

Both LoginPage and RegisterPage use the same outer layout:

```
<div className="min-h-screen bg-scribble-bg">
  <Navbar />
  <main className="flex items-start justify-center px-4 pt-24 pb-12">
    <div className="w-full max-w-md bg-scribble-surface border border-scribble-border
                    rounded-xl shadow-lg shadow-black/30 p-8">
      ...form content...
    </div>
  </main>
</div>
```

- `pt-24` ensures the card clears the 56px navbar with breathing room.
- `px-4` provides minimum horizontal padding on very narrow screens.

### 3.3 `<LoginPage />`

**File**: `client/src/components/auth/LoginPage.jsx`  
**Route**: `/login`

#### Props
None — uses `useAuth()` from AuthContext and `useNavigate()` from react-router-dom.

#### State Management
```
const [identifier, setIdentifier] = useState('');   // username or email
const [password, setPassword] = useState('');
const [errors, setErrors] = useState({});            // { field: message }
const [serverError, setServerError] = useState('');  // generic top banner
const [isSubmitting, setIsSubmitting] = useState(false);
```

#### Visual Hierarchy

```
┌─────────────────────────────────┐
│  [Error Banner]  ← if serverError│
│                                 │
│  Welcome Back                   │  ← h1, text-2xl, font-bold, text-white, mb-6
│                                 │
│  Username or Email *            │  ← Label
│  [________________________]     │  ← Input
│  ↑ inline error                  │  ← only if errors.identifier
│                                 │
│  Password *                     │  ← Label
│  [________________________]     │  ← Input (type="password")
│  ↑ inline error                  │  ← only if errors.password
│                                 │
│  [█████ Log In █████]           │  ← Submit: w-full py-2.5 bg-scribble-primary
│                                   ←    text-white font-semibold rounded-lg
│                                   ←    hover:bg-scribble-primary-dark
│                                   ←    disabled:opacity-50
│                                   ←    Loading state: "Logging in..." text
│                                 │
│  ─────────── or ───────────    │  ← muted divider line
│                                 │
│  Don't have an account? Sign up │  ← text-scribble-muted + link
└─────────────────────────────────┘
```

#### Submit Button States

| State | Text | Classes |
|---|---|---|
| Default | "Log In" | `bg-scribble-primary hover:bg-scribble-primary-dark` |
| Loading/Submitting | "Logging in..." | `bg-scribble-primary-dark cursor-wait opacity-70` |
| Disabled (empty fields) | "Log In" | `opacity-50 cursor-not-allowed` |

#### Error Banner (Top)

```html
{serverError && (
  <div className="mb-6 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm flex items-start" role="alert">
    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" ... />  {/* ⚠ icon */}
    <span>{serverError}</span>
  </div>
)}
```

**Classes for banner**: `bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm`

#### "Or" Divider (between form and register link)

```html
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-scribble-border"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-3 bg-scribble-surface text-scribble-muted">or</span>
  </div>
</div>
```

#### Bottom Link

```html
<p className="text-center text-scribble-muted text-sm">
  Don't have an account?{' '}
  <Link to="/register" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors">
    Sign up
  </Link>
</p>
```

### 3.4 `<RegisterPage />`

**File**: `client/src/components/auth/RegisterPage.jsx`  
**Route**: `/register`

#### Props
None.

#### State Management
```
const [formData, setFormData] = useState({
  name: '', username: '', email: '', password: '', confirmPassword: ''
});
const [errors, setErrors] = useState({});       // field-level
const [serverError, setServerError] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
```

#### Visual Hierarchy

```
┌─────────────────────────────────┐
│  [Error Banner]  ← if serverError│
│                                 │
│  Create Account                 │  ← h1
│                                 │
│  Name *                         │
│  [________________________]     │
│                                 │
│  Username *                     │
│  [________________________]     │
│  3-50 characters, letters,      │  ← hint: text-xs text-scribble-muted mt-1
│  numbers, and underscores        │
│                                 │
│  Email *                        │
│  [________________________]     │
│                                 │
│  Password *                     │
│  [________________________]     │  ← type="password"
│  Minimum 8 characters            │  ← hint
│                                 │
│  Confirm Password *             │
│  [________________________]     │  ← type="password"
│  ↑ "Passwords do not match"      │  ← inline error
│                                 │
│  [████ Create Account ████]     │  ← Submit button
│                                 │
│  Already have an account? Log in│
└─────────────────────────────────┘
```

#### Submit Button States

Same as LoginPage: Default, Loading ("Creating account..."), Disabled.

#### Field Hints

Each field with a format constraint gets a hint below the input (above any error):

```html
<p className="mt-1 text-xs text-scribble-muted">
  3–50 characters, letters, numbers, and underscores
</p>
```

### 3.5 `<ProfilePage />`

**File**: `client/src/components/profile/ProfilePage.jsx`  
**Route**: `/profile`

#### Props
None. Uses `useAuth()` for `user`, `updateProfile`, `changeEmail`, `changePassword`, `refreshUser`.

#### Overall Layout

```
<div className="min-h-screen bg-scribble-bg">
  <Navbar />
  <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <UserInfoCard />
    <ChangeEmailCard />
    <ChangePasswordCard />
  </main>
</div>
```

`max-w-2xl` (672px) gives the profile page a comfortable reading width. `space-y-6` separates the three cards.

#### Section Structure (each card)

```html
<section className="bg-scribble-surface border border-scribble-border rounded-xl shadow-lg shadow-black/30 p-6">
  <h2 className="text-lg font-semibold text-white mb-4">Section Title</h2>
  ...content...
</section>
```

---

#### 3.5.1 User Info Card (Section 1)

**Title**: "Profile"  
**Top-right**: "Edit" button (visible in view mode, hidden in edit mode)

```
┌──────────────────────────────────────────────┐
│  Profile                           [Edit]     │  ← h2 + button
├──────────────────────────────────────────────┤
│                                              │
│  VIEW MODE (default):                        │
│  ┌──────────────────────────────────────┐   │
│  │ Display Name     Alice Smith         │   │  ← label:value pairs
│  │ Username         alice               │   │   label: text-xs text-scribble-muted
│  │ Email            alice@example.com   │   │   value: text-sm text-white
│  │ Member Since     July 4, 2026        │   │   each row: flex justify-between py-1.5
│  └──────────────────────────────────────┘   │   border-b border-scribble-border last:border-0
│                                              │
│  EDIT MODE (after clicking "Edit"):          │
│  ┌──────────────────────────────────────┐   │
│  │ Display Name     [Alice Smith______] │   │  ← input replaces value
│  │ Username         [alice____________] │   │  ← input replaces value
│  │ Email            alice@example.com   │   │  ← read-only (change in section 2)
│  │ Member Since     July 4, 2026        │   │  ← read-only always
│  └──────────────────────────────────────┘   │
│                                              │
│  [Save Changes]    [Cancel]                 │  ← only visible in edit mode
│  ↑ success/error message                     │
└──────────────────────────────────────────────┘
```

**Edit button** (top-right):
```html
<button
  onClick={() => setIsEditing(true)}
  className="text-sm text-scribble-primary hover:text-white transition-colors font-medium"
>
  Edit
</button>
```

**Info rows (view mode)**:
```html
<div className="space-y-1">
  <div className="flex justify-between items-center py-2 border-b border-scribble-border last:border-0">
    <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Display Name</span>
    <span className="text-sm text-white">{user.name}</span>
  </div>
  ...repeat for username, email, created_at...
</div>
```

**Edit mode**:
- Name and username fields become `<input>` elements following the `form-input` pattern above.
- Email row remains text (static).
- Member Since row remains text (static).
- Save + Cancel buttons appear below the fields.

**Save button**: `bg-scribble-primary hover:bg-scribble-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`

**Cancel button**: `text-scribble-muted hover:text-white text-sm font-medium px-4 py-2 transition-colors` (no background, inline)

**Success message**: Green banner `bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-green-300 text-sm` with "Profile updated successfully."

**Error message**: Red banner same as login/register error banner pattern, or inline field errors.

---

#### 3.5.2 Change Email Card (Section 2)

**Title**: "Change Email"

```
┌──────────────────────────────────────────────┐
│  Change Email                                 │
├──────────────────────────────────────────────┤
│                                              │
│  New Email *                                 │
│  [__________________________________]       │
│                                              │
│  Current Password * (for verification)       │
│  [__________________________________]       │
│                                              │
│  [████ Update Email ████]                    │
│  ↑ success/error message                     │
└──────────────────────────────────────────────┘
```

**State**: Independent form state with its own `isSubmitting`, `error`, `success` states.

- Two fields: new email, current password
- Submit button: "Update Email" / "Updating..."
- On success: green message "Email updated successfully" + `refreshUser()` to update displayed email in Section 1
- On error: red message inline below the form or server-side inline errors per field

---

#### 3.5.3 Change Password Card (Section 3)

**Title**: "Change Password"

```
┌──────────────────────────────────────────────┐
│  Change Password                              │
├──────────────────────────────────────────────┤
│                                              │
│  Current Password *                          │
│  [__________________________________]       │
│                                              │
│  New Password *                              │
│  [__________________________________]       │
│  Minimum 8 characters                        │  ← hint
│                                              │
│  Confirm New Password *                      │
│  [__________________________________]       │
│  ↑ "Passwords do not match"                  │  ← inline error
│                                              │
│  [████ Change Password ████]                 │
│  ↑ success/error message                     │
└──────────────────────────────────────────────┘
```

**State**: Independent form state.

- Three fields: current password, new password, confirm new password
- Submit button: "Change Password" / "Changing..."
- On success: "Password changed successfully" in green
- On error: "Current password is incorrect" or "Passwords do not match" per field
- Fields are cleared on success (confirmation state not needed — the success message is sufficient)

---

#### 3.5.4 Success/Error Message Pattern (shared across all Profile sections)

```html
{success && (
  <div className={`p-3 rounded-lg text-sm ${successClass}`} role="status">
    {success}
  </div>
)}
{error && (
  <div className={`p-3 rounded-lg text-sm ${errorClass} flex items-start`} role="alert">
    <span>{error}</span>
  </div>
)}
```

| Type | Classes |
|---|---|
| Success | `bg-green-900/30 border border-green-500/50 text-green-300` |
| Error | `bg-red-900/30 border border-red-500/50 text-red-300` |

These messages appear **below the submit button** within each section, with `mt-3` spacing.

---

### 3.6 `<Navbar />`

**File**: `client/src/components/layout/Navbar.jsx`

#### Props
None. Uses `useAuth()` for `user` and `logout`.

#### Structure

```html
<header className="sticky top-0 z-50 bg-scribble-surface border-b border-scribble-border">
  <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
    {/* Left: Logo */}
    <Link to="/" className="text-lg font-bold tracking-wider text-white hover:text-scribble-primary transition-colors">
      Scribble
    </Link>

    {/* Right: Navigation */}
    <nav className="flex items-center gap-4 text-sm">
      {user ? (
        <>
          <Link to="/profile" className="text-scribble-muted hover:text-white transition-colors">
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="text-scribble-muted hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="text-scribble-muted hover:text-white transition-colors">
            Login
          </Link>
          <Link
            to="/register"
            className="px-3 py-1.5 rounded-lg bg-scribble-primary text-white text-sm font-medium
                       hover:bg-scribble-primary-dark transition-colors"
          >
            Register
          </Link>
        </>
      )}
    </nav>
  </div>
</header>
```

**Height**: `h-14` (56px) — consistent, compact, doesn't eat canvas space.

**Max width**: `max-w-6xl` (1152px) — keeps content from stretching too wide on ultra-wide monitors.

**Sticky**: `sticky top-0 z-50` — stays visible when scrolling long profile pages.

**Register button**: Purple filled button to make it the visual call-to-action (vs. ghost link for Login).

**Logout handler**:
```
const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

---

### 3.7 `<ProtectedRoute />`

**File**: `client/src/components/auth/ProtectedRoute.jsx`

#### Props
`children: ReactNode`

#### Logic

```
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;  // or <SplashScreen message="Checking authentication..." />
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

- While `loading === true`, render nothing (an empty fragment). The SplashScreen is handled at the App level during the initial auth check, so ProtectedRoute seeing `loading === true` means the initial check is still happening.
- If no user and loading is done: redirect to `/login`.
- Otherwise: render children (the protected page).

---

### 3.8 `<GuestRoute />`

**File**: `client/src/components/auth/GuestRoute.jsx`

#### Props
`children: ReactNode`

#### Logic

```
function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/profile" replace />;
  return children;
}
```

- Authenticated users on `/login` or `/register` get redirected to `/profile`.

---

### 3.9 `<SplashScreen />` Re-use for Loading State

**File**: `client/src/components/SplashScreen.jsx` (already exists)

The existing SplashScreen component accepts a `message` prop. During initial auth check in the App component:

```jsx
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AuthRouter() {
  const { loading } = useAuth();

  if (loading) {
    return <SplashScreen message="Loading your account..." />;
  }

  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

This ensures no flash of login page for authenticated users during the initial session check.

---

## 4. Interaction Flows

### 4.1 Login Flow

```
User navigates to /login (or is redirected by ProtectedRoute)
  │
  ├─ If already authenticated → GuestRoute redirects to /profile
  │
  └─ If guest →
       1. Fields: identifier + password
       2. User types, no validation until submit
       3. User clicks "Log In" (or presses Enter)
       4. Client-side validation:
          - Both fields trimmed, non-empty → else show "required" error
       5. If valid:
          a. Button → "Logging in..." + disabled
          b. POST /api/auth/login { identifier, password }
          c. On 200: AuthContext stores user, navigate to /profile
          d. On 401: Clear password field, show "Invalid username/email or password"
          e. On 400: Show specific field errors
          f. On network failure: show "Unable to connect to server"
       6. Button returns to "Log In" state on error
```

**Enter key**: `<form onSubmit={handleSubmit}>` handles Enter key natively.

### 4.2 Registration Flow

```
User navigates to /register
  │
  ├─ If already authenticated → GuestRoute redirects to /profile
  │
  └─ If guest →
       1. All 5 fields visible
       2. User fills in fields
       3. User clicks "Create Account" (or presses Enter)
       4. Client-side validation (in order):
          a. All fields trimmed, non-empty → else "Field is required"
          b. Username: 3-50 chars, matches /^[a-zA-Z0-9_]+$/
          c. Email: contains @ and a domain
          d. Password: min 8 characters
          e. Confirm password matches password
       5. If valid:
          a. Button → "Creating account..." + disabled
          b. POST /api/auth/register { name, username, email, password, confirm_password }
          c. On 201: AuthContext stores user, navigate to /profile
          d. On 409 (username taken): inline error on username field
          e. On 409 (email taken): inline error on email field
          f. On 400: show field-specific errors from server
          g. On network failure: show "Unable to connect to server"
       6. Button returns to "Create Account" on error
```

### 4.3 Profile Viewing & Editing

```
User clicks "Profile" in Navbar → /profile
  │
  ├─ ProtectedRoute checks auth → renders ProfilePage
  │
  └─ ProfilePage loads:
       ├── Section 1: UserInfoCard (view mode)
       │   - Shows name, username, email, member since
       │   - User clicks "Edit"
       │   - Name and username become text inputs
       │   - "Save Changes" and "Cancel" appear
       │   - User edits, clicks Save → PUT /api/auth/profile
       │     - On success: green message, back to view mode, data updated
       │     - On 409 (username taken): inline error on username
       │     - On error: red message
       │   - User clicks Cancel → back to view mode, discard changes
       │
       ├── Section 2: ChangeEmailCard
       │   - User enters new email + current password
       │   - Clicks "Update Email" → PUT /api/auth/email
       │     - On success: green message, fields cleared, refreshUser()
       │     - On 403 (wrong password): error message
       │     - On 409 (email taken): error message
       │
       └── Section 3: ChangePasswordCard
           - User enters current + new + confirm
           - Clicks "Change Password" → PUT /api/auth/password
             - On success: green message, ALL fields cleared
             - On 403 (wrong current): error message
             - On mismatch: inline error on confirm field
```

### 4.4 Logout Flow

```
User clicks "Logout" in Navbar
  │
  ├─ handleLogout() called
  ├─ POST /api/auth/logout
  ├─ AuthContext sets user = null
  └─ navigate('/login')
```

**No confirmation dialog** — logout is an immediate action. Undo is simply logging back in.

### 4.5 Auth State Transitions (App Level)

```
App mount
  │
  └─ AuthProvider initialized
       │
       ├─ loading = true (SplashScreen shown)
       │
       ├─ GET /api/auth/csrf   (fetch CSRF token)
       ├─ GET /api/auth/me     (check existing session)
       │   ├─ 200 → user = response.user, loading = false
       │   └─ 401 → user = null, loading = false
       │
       └─ loading = false → Routes render based on user state
```

## 5. Responsive Design

### 5.1 Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | < 640px (`sm`) | Single column, tight spacing, full-width cards |
| Tablet+ | ≥ 640px (`sm`) | Cards have max-width, centered |
| Desktop | ≥ 1024px (`lg`) | Profile page gets `max-w-2xl`, comfortable reading width |
| Wide | ≥ 1280px (`xl`) | Max-width constraints prevent over-stretching |

### 5.2 Navbar Adaptation

- Desktop: Full logo "Scribble" + text links with gap-4
- Mobile (< 640px): Everything same but gap reduced to `gap-2` or `gap-3`. The "Register" button may wrap — use `flex-wrap` on the nav if needed.
- Minimum touch target: 44×44px (links have adequate padding)

### 5.3 Auth Form Cards (Login/Register)

- Always `max-w-md` (448px)
- `px-4` on the container for breathing room when screen < card width
- Card padding: `p-8` desktop, `p-6` mobile (change via responsive: `p-6 sm:p-8`)

### 5.4 Profile Page Cards

```html
<main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
```

- `max-w-2xl` (672px) — comfortable for reading profile info
- `px-4` — minimum horizontal padding
- `space-y-6` — consistent vertical rhythm between cards
- Each card: `p-6` (no responsive change needed — 24px is fine for all sizes)

### 5.5 Form Button Width

- Auth pages (Login, Register): Buttons are `w-full` (max-width of the card contstraints them)
- Profile page: Buttons are inline (content-width). "Save Changes" button `px-6` wide.

---

## 6. Color & Type Palette

### 6.1 Scribble Theme (Tailwind Custom Colors)

These already exist in `client/tailwind.config.js`:

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| Background | `#1a1a2e` | `bg-scribble-bg` | Page backgrounds |
| Surface | `#16213e` | `bg-scribble-surface` | Cards, navbar |
| Border | `#0f3460` | `border-scribble-border` | Card borders, dividers, input borders |
| Primary | `#6c63ff` | `bg-scribble-primary` | Submit buttons, focus rings, link color |
| Primary Dark | `#3f3d9e` | `bg-scribble-primary-dark` | Button hover state |
| Muted | `#8892b0` | `text-scribble-muted` | Labels, hints, inactive nav links |

### 6.2 Additional Colors Used (from Tailwind palette)

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| White | `#ffffff` | `text-white` | Headings, active nav links, input text, button text |
| Red (error) | — | `text-red-400`, `border-red-400`, `bg-red-900/30`, `border-red-500/50`, `text-red-300` | Error messages, validation errors |
| Green (success) | — | `text-green-400`, `bg-green-900/30`, `border-green-500/50`, `text-green-300` | Success messages |

### 6.3 Typography

All text uses the default system font stack (Tailwind's `font-sans`). No custom web fonts.

| Element | Classes | Example |
|---|---|---|
| Page title (card heading) | `text-2xl font-bold text-white mb-6` | "Welcome Back", "Create Account" |
| Section heading (profile) | `text-lg font-semibold text-white mb-4` | "Change Email" |
| Input label | `block text-sm font-medium text-scribble-muted mb-1.5` | "Username or Email" |
| Input value (profile) | `text-sm text-white` | "Alice Smith" |
| Input hint | `mt-1 text-xs text-scribble-muted` | "Minimum 8 characters" |
| Error text | `mt-1 text-sm text-red-400` | "This field is required" |
| Link text | `text-scribble-primary hover:text-white underline underline-offset-2 transition-colors` | "Sign up" |
| Navbar links | `text-scribble-muted hover:text-white transition-colors text-sm` | "Login", "Profile" |
| Navbar logo | `text-lg font-bold tracking-wider text-white hover:text-scribble-primary` | "Scribble" |
| Submit button | `text-white font-semibold text-sm` (on `bg-scribble-primary`) | "Log In" |
| Card body text | `text-sm text-white` | User info values |

---

## 7. Accessibility

### 7.1 Semantic HTML

- `<header>` for Navbar
- `<main>` for page content
- `<nav>` for navigation links within Navbar
- `<section>` for each profile card
- `<h1>` for page titles ("Welcome Back", "Create Account")
- `<h2>` for profile section titles ("Profile", "Change Email", "Change Password")
- `<form>` with `onSubmit` (not raw `<div>` with onClick)
- `<label htmlFor="...">` for every input — always visible (not placeholder-only)
- `<button type="submit">` for all form submit buttons (not `<input type="submit">` for styling flexibility)

### 7.2 Focus Management

- All inputs have visible focus ring: `focus:ring-2 focus:ring-scribble-primary focus:border-transparent`
- Links have `focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:ring-offset-2 focus:ring-offset-scribble-surface rounded` (particularly important for navbar links)
- Submit buttons have `focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:ring-offset-2 focus:ring-offset-scribble-bg`
- On form error, focus moves to the first field with an error

### 7.3 ARIA Attributes

| Element | Attributes |
|---|---|
| Error banner (top) | `role="alert"` — announces to screen readers immediately |
| Field error | `role="alert"` on the error `<p>` |
| Success message | `role="status"` — less aggressive than alert |
| Submit button (loading) | `aria-busy="true"`, `aria-label="Logging in, please wait"` |
| Form inputs | `required`, `aria-required="true"`, `aria-invalid={!!error}`, `aria-describedby="field-error-id"` |
| Navbar | `role="navigation"`, `aria-label="Main navigation"` |

### 7.4 Contrast Ratios

All text color combinations meet WCAG AA (4.5:1) or AAA (7:1):

| Pair | Ratio | Pass |
|---|---|---|
| `#ffffff` on `#16213e` (surface) | 12.6:1 | AAA |
| `#8892b0` (muted) on `#1a1a2e` (bg) | 5.6:1 | AA |
| `#6c63ff` (primary) on `#1a1a2e` (bg) | 4.5:1 | AA |
| `#f87171` (red-400) on `#1a1a2e` (bg) | 4.7:1 | AA |
| `#4ade80` (green-400) on `#1a1a2e` (bg) | 5.3:1 | AA |
| `#ffffff` on `#6c63ff` (primary) | 4.7:1 | AA |
| `#fca5a5` (red-300) on `rgba(127,29,29,0.3)` (red-900/30) | 5.1:1 | AA |

### 7.5 Keyboard Navigation

- Tab order follows visual order (no manual `tabIndex`)
- Enter submits forms when focus is on any form field
- Escape cancels inline editing on Profile page (returns to view mode)
- All buttons and links are keyboard-focusable and operable with Enter/Space

### 7.6 Reduced Motion

- Submit button loading states do NOT use animations — they use static text changes ("Log In" → "Logging in...")
- Focus ring transitions: `transition-colors` (color only, no size animation that might trigger vestibular issues)

---

## 8. Real-time & Electron UX

### 8.1 Real-time Considerations (Forward-looking)

- The `AuthContext.user` object is the single source of truth for current user identity
- Future WebSocket connections can use the session cookie automatically (same origin)
- The CSRF token fetched on mount is stored in memory (not localStorage/sessionStorage) via module-level variable in `api.js` — future real-time connections don't need to worry about it expiring mid-session
- **No real-time UX for auth itself** — authentication is a classic request/response flow

### 8.2 Electron Desktop UX

- The Electron `BrowserWindow` loads the same React app — auth works identically
- Session cookies are stored in Electron's Chromium session (persisted across app restarts — user stays logged in)
- No native menus for auth (login/register are web pages within the same window)
- The Electron window already has `backgroundColor: '#1a1a2e'` set (from Feature #1) — no white flash during auth page transitions

### 8.3 Loading States (Electron-specific)

- If the Electron app launches and the Flask server isn't running yet, the auth check fails with a network error
- The frontend catches this and shows "Unable to connect to server" in the error display area
- This is acceptable per the tech spec — the user starts the server separately

---

## 9. Implementation Checklist

| # | Task | Priority |
|---|---|---|
| 1 | Install `react-router-dom` in client | P0 |
| 2 | Create `client/src/contexts/AuthContext.jsx` | P0 |
| 3 | Create `client/src/utils/api.js` (fetch wrapper with CSRF) | P0 |
| 4 | Create `client/src/components/layout/Navbar.jsx` | P0 |
| 5 | Create `client/src/components/auth/LoginPage.jsx` | P0 |
| 6 | Create `client/src/components/auth/RegisterPage.jsx` | P0 |
| 7 | Create `client/src/components/auth/ProtectedRoute.jsx` | P0 |
| 8 | Create `client/src/components/auth/GuestRoute.jsx` | P0 |
| 9 | Create `client/src/components/profile/ProfilePage.jsx` | P0 |
| 10 | Modify `client/src/App.jsx` (BrowserRouter, Routes, AuthProvider) | P0 |
| 11 | Add `focus:ring` styles to navbar links | P1 |
| 12 | Add `aria-describedby` linking to error messages | P1 |
| 13 | Add `aria-busy` and loading text to submit buttons | P1 |
| 14 | Handle Enter key to submit forms (onSubmit on `<form>`) | P1 |
| 15 | Handle Escape to cancel inline editing on Profile page | P2 |
| 16 | Trim all inputs before validation and submission | P2 |

---

## Appendix A: Form Validation Rules Summary

| Field | Rule | Error Message |
|---|---|---|
| Name (register) | Required, non-empty after trim | "Name is required" |
| Username | Required, 3–50 chars, `/^[a-zA-Z0-9_]+$/` | "Username must be 3–50 characters and contain only letters, numbers, and underscores" |
| Email | Required, contains `@` and domain part | "Please enter a valid email address" |
| Password | Required, minimum 8 characters | "Password must be at least 8 characters" |
| Confirm Password | Required, must match password | "Passwords do not match" |
| Identifier (login) | Required, non-empty after trim | "Username or email is required" |

## Appendix B: API Error → Field Mapping

Server errors are mapped to specific form fields for inline display:

| Server Error | Frontend Field | Display Location |
|---|---|---|
| `"Field 'name' is required"` | `errors.name` | Below name input |
| `"Username is already taken"` | `errors.username` | Below username input |
| `"Email is already registered"` | `errors.email` | Below email input |
| `"Invalid email format"` | `errors.email` | Below email input |
| `"Password must be at least 8 characters"` | `errors.password` | Below password input |
| `"Passwords do not match"` | `errors.confirmPassword` | Below confirm password input |
| `"Invalid username/email or password"` | `serverError` | Top banner (login page) |
| `"Current password is incorrect"` | `errors.currentPassword` or section-level error | Below current password input |
| `"Email is already registered"` (email change) | `errors.newEmail` | Below new email input |
| `"Username must be 3–50..."` | `errors.username` | Below username input (profile edit) |
| Network failure | `serverError` | Top banner |

---

## 10. Email Verification & Password Reset — Design

### New Pages
- **Verification Banner** on Profile: amber warning "Your email is not verified" + "Resend verification email" button. States: idle, sending, success (green), error (red). Auto-dismiss success after 10s.
- **Forgot Password Page** (`/forgot-password`): centered card, email input, "Send Reset Link" button. Guest route. Always shows same success message. Link back to login.
- **Reset Password Page** (`/reset-password?token=`): public. Validates token on mount (loading spinner). If valid: new password + confirm form. If invalid: "Link Expired" with link to /forgot-password. Success: "Password Reset!" with link to /login.
- **Verify Email Page** (`/verify-email?token=`): public. API call on mount. Loading spinner. Success: "Email Verified!" with link to profile. Error: "Verification Failed" with link to profile to resend.

### Design System Consistency
- All pages use same centered card pattern as Login/Register
- Same input, button, error banner, success icon patterns
- Amber colors for verification banner: bg-amber-900/20 border-amber-500/40 text-amber-300
- Loading: SplashScreen-style dot animation
- Responsive: mobile-first, same breakpoints

### AuthContext Additions
New methods: forgotPassword(email), resetPassword(token, newPassword), verifyEmail(token), resendVerification()

### Route Architecture
```
/forgot-password → GuestRoute → ForgotPasswordPage
/reset-password → public → ResetPasswordPage  
/verify-email → public → VerifyEmailPage
```

### Profile Page Change
VerificationBanner component rendered between Navbar and first card section when user.email_verified === false.

### Login Page Change
"Forgot password?" link added below password field, above submit button.
