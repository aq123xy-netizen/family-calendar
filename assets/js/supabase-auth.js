(function () {
  var config = window.FAMILY_CALENDAR_SUPABASE || {};
  var isProtectedPage = document.body && document.body.getAttribute("data-requires-auth") === "true";
  var siteAuthElement = document.getElementById("site-auth");
  var client = null;

  function isConfigured() {
    return Boolean(config.url && config.anonKey && window.supabase);
  }

  function createClient() {
    if (!isConfigured()) {
      return null;
    }

    if (!client) {
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }

    return client;
  }

  function renderSetupMessage() {
    if (!siteAuthElement) {
      return;
    }

    siteAuthElement.innerHTML = '<span class="site-auth-note">Supabase not configured</span>';
  }

  function renderUser(user) {
    if (!siteAuthElement) {
      return;
    }

    var email = user && user.email ? user.email : "Signed in";

    siteAuthElement.innerHTML = [
      '<div class="site-auth-user">',
      '<span class="site-auth-email">', email, "</span>",
      '<button class="btn btn-sm btn-outline-dark" id="sign-out-button" type="button">Sign out</button>',
      "</div>"
    ].join("");

    var signOutButton = document.getElementById("sign-out-button");

    if (signOutButton) {
      signOutButton.addEventListener("click", async function () {
        var supabaseClient = createClient();

        if (!supabaseClient) {
          return;
        }

        await supabaseClient.auth.signOut();
        window.location.href = config.loginPath || "login.html";
      });
    }
  }

  function redirectToLogin() {
    var loginPath = config.loginPath || "login.html";
    var currentPath = window.location.pathname.split("/").pop() || "index.html";
    var query = "?next=" + encodeURIComponent(currentPath);

    window.location.href = loginPath + query;
  }

  async function requireAuth() {
    if (!isProtectedPage) {
      return;
    }

    if (!isConfigured()) {
      renderSetupMessage();
      return;
    }

    var supabaseClient = createClient();
    var userResult = await supabaseClient.auth.getUser();
    var user = userResult.data ? userResult.data.user : null;

    if (!user) {
      redirectToLogin();
      return;
    }

    renderUser(user);

    supabaseClient.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT" || !session || !session.user) {
        redirectToLogin();
        return;
      }

      renderUser(session.user);
    });
  }

  window.familyCalendarAuth = {
    createClient: createClient,
    isConfigured: isConfigured,
    requireAuth: requireAuth
  };

  if (isProtectedPage) {
    requireAuth();
  } else if (siteAuthElement && isConfigured()) {
    createClient().auth.getUser().then(function (result) {
      if (result.data && result.data.user) {
        renderUser(result.data.user);
      }
    });
  } else if (siteAuthElement) {
    renderSetupMessage();
  }
})();
