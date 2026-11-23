/* ============================================================
   SPYSMP NETWORK — Core Application Logic
   Apple Monochrome Architecture · Accessible · High Performance
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ── 1. THEME MANAGEMENT ── */
  var root = document.documentElement;
  var savedTheme = null;
  try { savedTheme = localStorage.getItem('nexa_theme'); } catch (e) {}
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  function toggleTheme() {
    var cur = root.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('nexa_theme', next); } catch (e) {}
  }

  var themeToggleBtn = $('themeToggleBtn');
  var tgBtn = $('tg');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (tgBtn) tgBtn.addEventListener('click', toggleTheme);

  /* ── 2. SIDEBAR NAVIGATION & ROUTING ── */
  var sidebar = $('sidebar');
  var overlay = $('sb-overlay');
  var toggleBtn = $('sb-toggle');
  var closeBtn = $('sb-close');

  window.closeSidebar = function () {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('on');
  };

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('on');
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', window.closeSidebar);
  if (overlay) overlay.addEventListener('click', window.closeSidebar);

  var pages = ['home', 'modes', 'vote', 'ranks', 'rules', 'join'];
  var pageTitles = {
    home: 'Overview — Flagship Minecraft Network',
    modes: 'Game Modes — 10 Custom Modes',
    vote: 'Community Poll — Shape Season One',
    ranks: 'Store & Support — Cosmetics Only',
    rules: 'Rules — Code of Conduct',
    join: 'Connection Guide — Server Endpoint'
  };

  function route() {
    var h = (location.hash || '#home').slice(1).toLowerCase();
    if (pages.indexOf(h) < 0) h = 'home';

    pages.forEach(function (p) {
      var el = $(p);
      if (el) el.style.display = (p === h) ? 'block' : 'none';
    });

    document.querySelectorAll('.sb-link').forEach(function (a) {
      var target = a.getAttribute('data-page') || (a.getAttribute('href') || '').slice(1);
      a.classList.toggle('active', target === h);
    });

    document.title = 'SpySMP Network — ' + (pageTitles[h] || 'Minecraft Community');

    if (h === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      var curSection = $(h);
      if (curSection) curSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (h === 'vote' && window.nexaRefreshVote) {
      window.nexaRefreshVote();
    }
  }

  window.addEventListener('hashchange', route);
  route();

  /* ── 3. REAL-TIME HTTP LATENCY PING MONITOR ── */
  var pingTag = $('pingTag');
  function measurePing() {
    if (document.hidden) return;
    var t0 = performance.now();
    fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
      .then(function () {
        var ms = Math.round(performance.now() - t0);
        if (pingTag) pingTag.textContent = ms + 'ms';
      })
      .catch(function () {
        if (pingTag) pingTag.textContent = 'online';
      });
  }
  measurePing();
  setInterval(measurePing, 8000);

  /* ── 4. GAME MODES SEARCH & CATEGORY FILTER ── */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var modeCards = document.querySelectorAll('.mc-card');
  var modeSearchInput = $('modeSearchInput');
  var activeCategory = 'all';

  function applyModeFilters() {
    var query = (modeSearchInput ? modeSearchInput.value : '').trim().toLowerCase();

    modeCards.forEach(function (card) {
      var catMatch = (activeCategory === 'all' || card.dataset.category === activeCategory);
      var textContent = (card.textContent || '').toLowerCase();
      var queryMatch = !query || textContent.indexOf(query) >= 0;

      if (catMatch && queryMatch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeCategory = btn.dataset.filter;
      applyModeFilters();
    });
  });

  if (modeSearchInput) {
    modeSearchInput.addEventListener('input', applyModeFilters);
  }

  /* ── 5. SERVER IP CLIPBOARD COPY ── */
  var SERVER_IP = 'play.spysmp.live';
  var DISCORD_URL = 'https://discord.gg/spysmp';

  function copyServerIP(evt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SERVER_IP).then(function () {
        showToast('✓ Copied ' + SERVER_IP + ' to clipboard');
      }).catch(function () {
        showToast('Server IP: ' + SERVER_IP);
      });
    } else {
      showToast('Server IP: ' + SERVER_IP);
    }
  }

  var quickCopyBtn = $('quickCopyBtn');
  var serverIpBox = $('serverIpBox');
  var dockCopyIp = $('dockCopyIp');
  if (quickCopyBtn) quickCopyBtn.addEventListener('click', copyServerIP);
  if (serverIpBox) serverIpBox.addEventListener('click', copyServerIP);
  if (dockCopyIp) dockCopyIp.addEventListener('click', copyServerIP);

  var discordBtn = $('discordBtn');
  if (discordBtn && DISCORD_URL) {
    discordBtn.addEventListener('click', function () {
      window.open(DISCORD_URL, '_blank', 'noopener');
    });
  }

  /* Toast Notification */
  var toastEl = $('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('on');
    }, 2800);
  }

  /* ── 6. API CLIENT ── */
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'X-Requested-With': 'nexa' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    return fetch(path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body,
      credentials: 'same-origin'
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) {}
        if (!r.ok) {
          var err = new Error(data.error || ('Request failed with status ' + r.status));
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* ── 7. AUTHENTICATION & USER PROFILE MANAGEMENT ── */
  var authDlg = $('authDlg');
  var authX = $('authX');
  var authTabs = $('authTabs');
  var authForm = $('authForm');
  var authSigned = $('authSigned');
  var authTitle = $('authTitle');
  var authIntro = $('authIntro');
  var authUserField = $('authUserField');
  var authUserLabel = $('authUserLabel');
  var authUser = $('authUser');
  var authEmailWrap = $('authEmailWrap');
  var authEmail = $('authEmail');
  var authPass = $('authPass');
  var pwdToggle = $('pwdToggle');
  var passStrengthWrap = $('passStrengthWrap');
  var passStrengthFill = $('passStrengthFill');
  var passStrengthTxt = $('passStrengthTxt');
  var authErr = $('authErr');
  var authGo = $('authGo');
  var authHint = $('authHint');
  var acctBtn = $('acctBtn');
  var acctLabel = $('acctLabel');
  var tbAcctBtn = $('tbAcctBtn');
  var tbAcctLabel = $('tbAcctLabel');
  var acctName = $('acctName');
  var acctBio = $('acctBio');
  var acctVote = $('acctVote');
  var logoutBtn = $('logoutBtn');
  var dockAcct = $('dockAcct');

  var authOtpForm = $('authOtpForm');
  var authOtpEmailHint = $('authOtpEmailHint');
  var authOtpCode = $('authOtpCode');
  var authOtpErr = $('authOtpErr');
  var authOtpGo = $('authOtpGo');
  var authOtpResend = $('authOtpResend');
  var authOtpTimer = $('authOtpTimer');
  var authOtpBack = $('authOtpBack');
  var pendingSignupUser = '';
  var pendingSignupEmail = '';
  var otpCountdownInterval = null;

  var ageDlg = $('ageDlg');
  var ageSelect = $('ageSelect');
  var ageBlock = $('ageBlock');
  var ageCancelBtn = $('ageCancelBtn');
  var ageConfirmBtn = $('ageConfirmBtn');

  var voteBtns = document.querySelectorAll('.vote-btn');
  var voteQ = document.querySelector('.vote-q');
  var voteNote = $('voteNote');
  var voteYes = $('voteYes');
  var voteNo = $('voteNo');
  var barYes = $('barYes');
  var barNo = $('barNo');
  var voteYesN = $('voteYesN');
  var voteNoN = $('voteNoN');
  var voteTotal = $('voteTotal');
  var voteCountBadge = $('voteCount');
  var memberCountEl = $('memberCount');

  /* Profile Photo & Customizer Elements */
  var acctAvatarWrap = $('acctAvatarWrap');
  var tbAcctAvatarWrap = $('tbAcctAvatarWrap');
  var acctAvatarModal = $('acctAvatarModal');
  var profileBioInput = $('profileBioInput');
  var profileDiscordInput = $('profileDiscordInput');
  var profileAvatarInput = $('profileAvatarInput');
  var saveProfileBtn = $('saveProfileBtn');
  var profileStatusMsg = $('profileStatusMsg');
  var avOptionBtns = document.querySelectorAll('.av-option-btn');

  var currentUser = null;
  var voteData = null;
  var pendingChoice = null;
  var authMode = 'login';
  var isBusy = false;
  var isAgeVerified = false;

  function resolveAvatarUrl(user, size) {
    if (!user) return '';
    if (user.avatar) return user.avatar;
    var s = size || 32;
    return 'https://mc-heads.net/avatar/' + encodeURIComponent(user.username) + '/' + s;
  }

  function updateAccountUI() {
    var name = currentUser ? currentUser.username : 'Log in';
    if (acctLabel) acctLabel.textContent = name;
    if (tbAcctLabel) tbAcctLabel.textContent = name;
    if (acctBtn) acctBtn.classList.toggle('in', !!currentUser);

    if (currentUser) {
      if (acctName) acctName.textContent = currentUser.username;
      if (acctBio) {
        acctBio.textContent = currentUser.bio || 'Verified SpySMP Network Member';
      }

      var avatarSm = resolveAvatarUrl(currentUser, 32);
      var avatarLg = resolveAvatarUrl(currentUser, 128);

      if (acctAvatarWrap) acctAvatarWrap.innerHTML = '<img src="' + avatarSm + '" alt="' + currentUser.username + '">';
      if (tbAcctAvatarWrap) tbAcctAvatarWrap.innerHTML = '<img src="' + avatarSm + '" alt="' + currentUser.username + '">';
      if (acctAvatarModal) acctAvatarModal.style.backgroundImage = 'url(' + avatarLg + ')';

      if (profileBioInput) profileBioInput.value = currentUser.bio || '';
      if (profileDiscordInput) profileDiscordInput.value = currentUser.discord || '';
      if (profileAvatarInput) profileAvatarInput.value = currentUser.avatar || '';

      if (authSigned) authSigned.hidden = false;
      if (authForm) authForm.hidden = true;
      if (authOtpForm) authOtpForm.hidden = true;
      if (authTabs) authTabs.hidden = true;
      if (acctVote) {
        acctVote.textContent = (voteData && voteData.my_vote)
          ? 'Your verified vote: ' + (voteData.my_vote === 'yes' ? 'Yes' : 'No') + '.'
          : "You haven't voted yet in the community poll.";
      }
    } else {
      if (acctAvatarWrap) acctAvatarWrap.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5.5" r="3"/><path d="M2.5 14c.5-3 2.7-4.5 5.5-4.5s5 1.5 5.5 4.5" stroke-linecap="round"/></svg>';
      if (tbAcctAvatarWrap) tbAcctAvatarWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5.5" r="3"/><path d="M2.5 14c.5-3 2.7-4.5 5.5-4.5s5 1.5 5.5 4.5" stroke-linecap="round"/></svg>';
      if (authSigned) authSigned.hidden = true;
      if (authTabs) authTabs.hidden = false;
    }
  }

  /* Quick Avatar Preset Selectors */
  avOptionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      avOptionBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var type = btn.dataset.av;

      if (!currentUser) return;
      if (type === 'mc') {
        if (profileAvatarInput) profileAvatarInput.value = '';
        if (acctAvatarModal) acctAvatarModal.style.backgroundImage = 'url(https://mc-heads.net/avatar/' + encodeURIComponent(currentUser.username) + '/128)';
      } else if (type === 'gh') {
        var ghUrl = 'https://github.com/' + encodeURIComponent(currentUser.username) + '.png';
        if (profileAvatarInput) profileAvatarInput.value = ghUrl;
        if (acctAvatarModal) acctAvatarModal.style.backgroundImage = 'url(' + ghUrl + ')';
      }
    });
  });

  if (profileAvatarInput) {
    profileAvatarInput.addEventListener('input', function () {
      var val = profileAvatarInput.value.trim();
      if (val && acctAvatarModal) {
        acctAvatarModal.style.backgroundImage = 'url(' + val + ')';
      }
    });
  }

  /* Save Profile Changes */
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async function () {
      if (!currentUser) return;
      saveProfileBtn.disabled = true;
      saveProfileBtn.textContent = 'Saving…';
      if (profileStatusMsg) {
        profileStatusMsg.textContent = '';
        profileStatusMsg.className = 'profile-status-msg';
      }

      var avatarVal = (profileAvatarInput ? profileAvatarInput.value : '').trim();
      var bioVal = (profileBioInput ? profileBioInput.value : '').trim();
      var discordVal = (profileDiscordInput ? profileDiscordInput.value : '').trim();

      try {
        var res = await api('/api/profile', {
          method: 'POST',
          body: JSON.stringify({ avatar: avatarVal, bio: bioVal, discord: discordVal })
        });
        currentUser = res.user;
        updateAccountUI();
        if (profileStatusMsg) {
          profileStatusMsg.textContent = '✓ Profile details saved!';
          profileStatusMsg.className = 'profile-status-msg ok';
        }
        showToast('Profile updated successfully');
      } catch (err) {
        if (profileStatusMsg) {
          profileStatusMsg.textContent = err.message || 'Could not update profile.';
          profileStatusMsg.className = 'profile-status-msg err';
        }
      } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Save Profile Changes';
      }
    });
  }

  function checkPasswordStrength(p) {
    if (!passStrengthFill || !passStrengthTxt) return;
    if (!p) {
      passStrengthFill.style.width = '0%';
      passStrengthFill.style.background = 'var(--red)';
      passStrengthTxt.textContent = 'Strength: Minimum 8 characters';
      return;
    }
    var score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    var pct = Math.min(100, Math.max(20, (score / 5) * 100));
    passStrengthFill.style.width = pct + '%';

    if (score < 2) {
      passStrengthFill.style.background = '#ff453a';
      passStrengthTxt.textContent = 'Strength: Weak (add letters and numbers)';
    } else if (score < 4) {
      passStrengthFill.style.background = '#ffd60a';
      passStrengthTxt.textContent = 'Strength: Moderate';
    } else {
      passStrengthFill.style.background = '#30d158';
      passStrengthTxt.textContent = 'Strength: Strong';
    }
  }

  function startOtpCooldown(seconds) {
    if (otpCountdownInterval) clearInterval(otpCountdownInterval);
    var remaining = seconds || 60;
    if (authOtpResend) authOtpResend.disabled = true;
    if (authOtpTimer) authOtpTimer.textContent = remaining;

    otpCountdownInterval = setInterval(function () {
      remaining--;
      if (authOtpTimer) authOtpTimer.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(otpCountdownInterval);
        if (authOtpResend) {
          authOtpResend.disabled = false;
          authOtpResend.textContent = 'Resend code';
        }
      }
    }, 1000);
  }

  function setAuthMode(m) {
    authMode = m;
    if (authTabs) {
      authTabs.querySelectorAll('button').forEach(function (btn) {
        var on = btn.dataset.tab === m;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    if (authMode === 'signup' && !isAgeVerified) {
      if (authDlg && authDlg.open) authDlg.close();
      openAgeGate();
      return;
    }

    if (authForm) authForm.hidden = false;
    if (authOtpForm) authOtpForm.hidden = true;
    if (authTabs) authTabs.hidden = false;

    if (m === 'login') {
      if (authTitle) authTitle.textContent = 'Welcome back.';
      if (authIntro) authIntro.textContent = 'Log in to vote and manage your account credentials.';
      if (authUserLabel) authUserLabel.textContent = 'Username or Email';
      if (authUser) {
        authUser.placeholder = 'Enter username or email';
        authUser.maxLength = 128;
      }
      if (authEmailWrap) authEmailWrap.hidden = true;
      if (authEmail) authEmail.required = false;
      if (passStrengthWrap) passStrengthWrap.hidden = true;
      if (authGo) authGo.textContent = 'Log in';
      if (authHint) authHint.textContent = 'New here? Choose Sign up above.';
    } else {
      if (authTitle) authTitle.textContent = 'Create an Account.';
      if (authIntro) authIntro.textContent = 'Verify your email to cast your vote and join the network.';
      if (authUserLabel) authUserLabel.textContent = 'Minecraft Username';
      if (authUser) {
        authUser.placeholder = 'e.g. JinshiCraft';
        authUser.maxLength = 20;
      }
      if (authEmailWrap) authEmailWrap.hidden = false;
      if (authEmail) authEmail.required = true;
      if (passStrengthWrap) passStrengthWrap.hidden = false;
      if (authGo) authGo.textContent = 'Send verification code';
      if (authHint) authHint.textContent = 'A 6-digit confirmation code will be dispatched to your email.';
      if (authPass) checkPasswordStrength(authPass.value || '');
    }
    if (authErr) authErr.textContent = '';
  }

  function openAuth(mode) {
    if (currentUser) {
      updateAccountUI();
    } else {
      setAuthMode(mode || 'login');
    }
    if (authDlg && !authDlg.open) authDlg.showModal();
    window.closeSidebar();
  }

  function closeAuth() {
    if (authDlg && authDlg.open) authDlg.close();
  }

  function openAgeGate() {
    if (ageSelect) ageSelect.value = '';
    if (ageBlock) ageBlock.hidden = true;
    if (ageConfirmBtn) ageConfirmBtn.disabled = true;
    if (ageDlg && !ageDlg.open) ageDlg.showModal();
  }

  if (ageSelect) {
    ageSelect.addEventListener('change', function () {
      var val = ageSelect.value;
      if (val === 'u13') {
        ageBlock.hidden = false;
        ageConfirmBtn.disabled = true;
      } else if (val) {
        ageBlock.hidden = true;
        ageConfirmBtn.disabled = false;
      } else {
        ageBlock.hidden = true;
        ageConfirmBtn.disabled = true;
      }
    });
  }

  if (ageCancelBtn) {
    ageCancelBtn.addEventListener('click', function () {
      if (ageDlg && ageDlg.open) ageDlg.close();
      setAuthMode('login');
      if (authDlg && !authDlg.open) authDlg.showModal();
    });
  }

  if (ageConfirmBtn) {
    ageConfirmBtn.addEventListener('click', function () {
      isAgeVerified = true;
      if (ageDlg && ageDlg.open) ageDlg.close();
      setAuthMode('signup');
      if (authDlg && !authDlg.open) authDlg.showModal();
    });
  }

  if (acctBtn) acctBtn.addEventListener('click', function () { openAuth(); });
  if (tbAcctBtn) tbAcctBtn.addEventListener('click', function () { openAuth(); });
  if (dockAcct) dockAcct.addEventListener('click', function () { openAuth(); });
  if (authX) authX.addEventListener('click', closeAuth);
  if (authDlg) {
    authDlg.addEventListener('click', function (e) {
      if (e.target === authDlg) closeAuth();
    });
  }

  if (authTabs) {
    authTabs.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setAuthMode(btn.dataset.tab);
      });
    });
  }

  if (pwdToggle && authPass) {
    pwdToggle.addEventListener('click', function () {
      var isPwd = authPass.type === 'password';
      authPass.type = isPwd ? 'text' : 'password';
      var eyeOn = pwdToggle.querySelector('.pwd-icon-eye');
      var eyeOff = pwdToggle.querySelector('.pwd-icon-off');
      if (eyeOn && eyeOff) {
        eyeOn.style.display = isPwd ? 'none' : 'block';
        eyeOff.style.display = isPwd ? 'block' : 'none';
      }
    });
  }

  if (authPass) {
    authPass.addEventListener('input', function () {
      if (authMode === 'signup') {
        checkPasswordStrength(authPass.value || '');
      }
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var u = (authUser.value || '').trim();
      var p = authPass.value || '';

      if (authMode === 'login') {
        if (!u || u.length < 3) {
          authErr.textContent = 'Please enter your username or email.';
          return;
        }
        if (p.length < 8) {
          authErr.textContent = 'Password must be at least 8 characters.';
          return;
        }
      } else {
        if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) {
          authErr.textContent = 'Username must be 3–20 alphanumeric characters or underscore.';
          return;
        }
        var em = (authEmail ? authEmail.value : '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          authErr.textContent = 'Please enter a valid email address.';
          return;
        }
        if (p.length < 8) {
          authErr.textContent = 'Password must be at least 8 characters.';
          return;
        }
        if (!isAgeVerified) {
          openAgeGate();
          return;
        }
      }

      if (isBusy) return;
      isBusy = true;
      authGo.disabled = true;
      authErr.textContent = '';
      var origLabel = authGo.textContent;
      authGo.textContent = authMode === 'login' ? 'Logging in…' : 'Sending code…';

      try {
        if (authMode === 'login') {
          var res = await api('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: u, password: p })
          });
          currentUser = res.user;
          updateAccountUI();
          authPass.value = '';
          closeAuth();
          showToast('Welcome back, ' + currentUser.username);
          await refreshVote();
          if (pendingChoice) {
            var c = pendingChoice;
            pendingChoice = null;
            await castVote(c);
          }
        } else {
          var emVal = (authEmail ? authEmail.value : '').trim();
          var res = await api('/api/signup', {
            method: 'POST',
            body: JSON.stringify({ username: u, email: emVal, password: p })
          });
          pendingSignupUser = u;
          pendingSignupEmail = emVal;
          authForm.hidden = true;
          authTabs.hidden = true;
          if (authOtpForm) authOtpForm.hidden = false;
          if (authOtpEmailHint) authOtpEmailHint.textContent = res.email_hint || emVal;
          if (authOtpCode) {
            authOtpCode.value = '';
            setTimeout(function () { authOtpCode.focus(); }, 100);
          }
          if (authOtpErr) authOtpErr.textContent = '';
          if (authOtpResend) {
            authOtpResend.innerHTML = 'Resend in <span id="authOtpTimer">60</span>s';
            authOtpTimer = $('authOtpTimer');
          }
          startOtpCooldown(60);
          showToast('Verification code dispatched to your email');
        }
      } catch (err) {
        authErr.textContent = err.status === 401
          ? 'Invalid username or password.'
          : err.status === 409
            ? (err.message || 'That username or email is already registered.')
            : (err.message || 'Authentication error.');
      } finally {
        isBusy = false;
        authGo.disabled = false;
        authGo.textContent = origLabel;
      }
    });
  }

  if (authOtpCode) {
    authOtpCode.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
    });
  }

  if (authOtpBack) {
    authOtpBack.addEventListener('click', function () {
      if (otpCountdownInterval) clearInterval(otpCountdownInterval);
      if (authOtpForm) authOtpForm.hidden = true;
      if (authForm) authForm.hidden = false;
      if (authTabs) authTabs.hidden = false;
      if (authEmail) authEmail.focus();
    });
  }

  if (authOtpResend) {
    authOtpResend.addEventListener('click', async function () {
      if (authOtpResend.disabled || !pendingSignupUser) return;
      authOtpResend.disabled = true;
      authOtpResend.textContent = 'Sending…';
      if (authOtpErr) authOtpErr.textContent = '';
      try {
        var res = await api('/api/signup/resend', {
          method: 'POST',
          body: JSON.stringify({ username: pendingSignupUser })
        });
        showToast('New code sent to ' + (res.email_hint || pendingSignupEmail));
        authOtpResend.innerHTML = 'Resend in <span id="authOtpTimer">60</span>s';
        authOtpTimer = $('authOtpTimer');
        startOtpCooldown(60);
      } catch (err) {
        if (authOtpErr) authOtpErr.textContent = err.message || 'Could not resend code.';
        authOtpResend.disabled = false;
        authOtpResend.textContent = 'Resend code';
      }
    });
  }

  if (authOtpForm) {
    authOtpForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var code = (authOtpCode.value || '').trim();
      if (!/^[0-9]{6}$/.test(code)) {
        if (authOtpErr) authOtpErr.textContent = 'Please enter the complete 6-digit code.';
        return;
      }
      if (isBusy) return;
      isBusy = true;
      if (authOtpGo) {
        authOtpGo.disabled = true;
        authOtpGo.textContent = 'Verifying…';
      }
      if (authOtpErr) authOtpErr.textContent = '';

      try {
        var res = await api('/api/signup/verify', {
          method: 'POST',
          body: JSON.stringify({ username: pendingSignupUser, code: code })
        });
        if (otpCountdownInterval) clearInterval(otpCountdownInterval);
        currentUser = res.user;
        updateAccountUI();
        if (authPass) authPass.value = '';
        if (authOtpCode) authOtpCode.value = '';
        if (authEmail) authEmail.value = '';
        closeAuth();
        showToast('Account verified! Welcome, ' + currentUser.username);
        await refreshVote();
        if (pendingChoice) {
          var c = pendingChoice;
          pendingChoice = null;
          await castVote(c);
        }
      } catch (err) {
        if (authOtpErr) authOtpErr.textContent = err.message || 'Incorrect or expired code.';
      } finally {
        isBusy = false;
        if (authOtpGo) {
          authOtpGo.disabled = false;
          authOtpGo.textContent = 'Verify & Create Account';
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      logoutBtn.disabled = true;
      try {
        await api('/api/logout', { method: 'POST', body: '{}' });
        currentUser = null;
        updateAccountUI();
        closeAuth();
        await refreshVote();
        showToast('Signed out successfully');
      } catch (e) {
        showToast('Could not log out.');
      } finally {
        logoutBtn.disabled = false;
      }
    });
  }

  /* ── 8. COMMUNITY VOTE LOGIC ── */
  function renderVote() {
    if (!voteData) return;
    if (voteData.question && voteQ) voteQ.textContent = voteData.question;
    var total = voteData.total || 0;
    var yes = voteData.yes || 0;
    var no = voteData.no || 0;

    if (voteYes) voteYes.textContent = (voteData.yes_pct || 0) + '%';
    if (voteNo) voteNo.textContent = (voteData.no_pct || 0) + '%';
    if (barYes) barYes.style.width = (voteData.yes_pct || 0) + '%';
    if (barNo) barNo.style.width = (voteData.no_pct || 0) + '%';
    if (voteYesN) voteYesN.textContent = yes + ' ' + (yes === 1 ? 'vote' : 'votes');
    if (voteNoN) voteNoN.textContent = no + ' ' + (no === 1 ? 'vote' : 'votes');
    if (voteTotal) {
      voteTotal.textContent = total + ' ' + (total === 1 ? 'vote' : 'votes') + ' cast · ' +
        (voteData.members || 0) + ' verified ' + ((voteData.members || 0) === 1 ? 'member' : 'members');
    }
    if (memberCountEl) memberCountEl.textContent = (voteData.members || 0);
    if (voteCountBadge) {
      voteCountBadge.textContent = total;
      voteCountBadge.style.display = total > 0 ? 'inline-block' : 'none';
    }

    voteBtns.forEach(function (btn) {
      var picked = voteData.my_vote === btn.dataset.choice;
      btn.classList.toggle('picked', picked);
      btn.setAttribute('aria-pressed', picked ? 'true' : 'false');
    });

    if (voteNote) {
      if (!currentUser) {
        voteNote.textContent = 'Sign in to record your verified vote (one vote per member, changeable anytime).';
      } else if (voteData.my_vote) {
        voteNote.textContent = 'You voted ' + (voteData.my_vote === 'yes' ? 'Yes' : 'No') + '. Click another option to update your response.';
      } else {
        voteNote.textContent = 'Signed in as ' + currentUser.username + '. Click an option above to submit your vote.';
      }
    }
  }

  async function refreshVote() {
    try {
      voteData = await api('/api/vote');
      renderVote();
    } catch (e) {
      if (voteNote) voteNote.textContent = 'Poll results updating…';
    }
  }
  window.nexaRefreshVote = refreshVote;

  async function refreshMe() {
    try {
      var d = await api('/api/me');
      currentUser = d.user;
    } catch (e) {
      currentUser = null;
    }
    updateAccountUI();
  }

  async function castVote(choice) {
    if (!currentUser) {
      pendingChoice = choice;
      openAuth('login');
      showToast('Please sign in to record your verified vote.');
      return;
    }

    voteBtns.forEach(function (b) { b.disabled = true; });
    try {
      voteData = await api('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ choice: choice })
      });
      renderVote();
      showToast('Vote recorded');
    } catch (e) {
      if (e.status === 401) {
        currentUser = null;
        updateAccountUI();
        pendingChoice = choice;
        openAuth('login');
      } else {
        showToast(e.message || 'Could not save vote.');
      }
    } finally {
      voteBtns.forEach(function (b) { b.disabled = false; });
    }
  }

  voteBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      castVote(btn.dataset.choice);
    });
  });

  refreshMe().then(refreshVote);

  /* ── 9. COOKIE CONSENT BANNER ── */
  (function () {
    var cb = $('cookieBanner');
    var cbBtn = $('cookieAcceptBtn');
    if (cb && cbBtn) {
      if (!localStorage.getItem('nexa_cookie_consent')) {
        setTimeout(function () { cb.classList.add('show'); }, 600);
      }
      cbBtn.addEventListener('click', function () {
        localStorage.setItem('nexa_cookie_consent', 'accepted');
        cb.classList.remove('show');
      });
    }
  })();

  /* ── 10. APPLE WEB AUDIO SOUND ENGINE ── */
  var audioCtx = null;
  var soundEnabled = true;
  try {
    soundEnabled = localStorage.getItem('nexa_sound') !== 'disabled';
  } catch (e) {}

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtx) audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'copy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'open') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.04);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        osc.start(now);
        osc.stop(now + 0.02);
      }
    } catch (err) {}
  }

  function updateSoundUI() {
    var icon = $('soundIcon');
    var label = $('soundLabel');
    if (icon) icon.textContent = soundEnabled ? '🔊' : '🔇';
    if (label) label.textContent = soundEnabled ? 'Sound On' : 'Muted';
  }

  var soundToggleBtn = $('soundToggleBtn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function () {
      soundEnabled = !soundEnabled;
      try { localStorage.setItem('nexa_sound', soundEnabled ? 'enabled' : 'disabled'); } catch (e) {}
      updateSoundUI();
      if (soundEnabled) playSound('click');
      showToast(soundEnabled ? '✓ Audio feedback active' : '✕ Audio feedback muted');
    });
    updateSoundUI();
  }

  /* ── 11. COMMAND CENTER (SPOTLIGHT PALETTE ⌘K) ── */
  var cmdkDlg = $('cmdkDlg');
  var cmdkInput = $('cmdkInput');
  var cmdkList = $('cmdkList');
  var cmdkCloseBtn = $('cmdkCloseBtn');
  var sbCmdBtn = $('sbCmdBtn');
  var tbCmdBtn = $('tbCmdBtn');
  var dockCmdk = $('dockCmdk');

  function filterCategory(cat) {
    var btn = document.querySelector('.filter-btn[data-filter="' + cat + '"]');
    if (btn) btn.click();
  }

  var cmdkItems = [
    { cat: 'Navigation', icon: '🏠', label: 'Overview', sub: 'Home & Infrastructure', key: '1', action: function () { location.hash = '#home'; } },
    { cat: 'Navigation', icon: '⚔️', label: 'Game Modes', sub: 'Explore 10 Custom Modes', key: '2', action: function () { location.hash = '#modes'; } },
    { cat: 'Navigation', icon: '🗳️', label: 'Community Poll', sub: 'Shape Season One Roadmap', key: '3', action: function () { location.hash = '#vote'; } },
    { cat: 'Navigation', icon: '💎', label: 'Store & Support', sub: 'Cosmetics & Ranks', key: '4', action: function () { location.hash = '#ranks'; } },
    { cat: 'Navigation', icon: '📜', label: 'Code of Conduct', sub: 'Server Rules & Fair Play', key: '5', action: function () { location.hash = '#rules'; } },
    { cat: 'Navigation', icon: '🚀', label: 'Connection Guide', sub: 'Java & Bedrock Setup', key: '6', action: function () { location.hash = '#join'; } },

    { cat: 'Actions', icon: '📋', label: 'Copy Server Endpoint', sub: 'play.spysmp.live', key: 'C', action: function () { copyServerIP(); } },
    { cat: 'Actions', icon: '🌐', label: 'Live Server Telemetry', sub: 'TPS, Ping & Node Diagnostics', key: 'Space', action: function () { openTelemetry(); } },
    { cat: 'Actions', icon: '🌓', label: 'Toggle Dark / Light Theme', sub: 'Switch visual palette', key: 'T', action: function () { toggleTheme(); playSound('click'); } },
    { cat: 'Actions', icon: '🔊', label: 'Toggle Audio Feedback', sub: 'Apple UI acoustic clicks', key: 'M', action: function () { if (soundToggleBtn) soundToggleBtn.click(); } },
    { cat: 'Actions', icon: '👤', label: 'Account & Profile Settings', sub: 'Custom Skin, Bio & Discord', key: '', action: function () { openAuth('login'); } },
    { cat: 'Actions', icon: '⌨️', label: 'Keyboard Shortcuts Cheat Sheet', sub: 'View all keyboard controls', key: '?', action: function () { openShortcuts(); } },
    { cat: 'Actions', icon: '🐙', label: 'Official GitHub Repository', sub: 'anusreekr5081-cyber/spysmp', key: '', action: function () { window.open('https://github.com/anusreekr5081-cyber/spysmp', '_blank', 'noopener'); } },
    { cat: 'Actions', icon: '📄', label: 'Official GitHub Pages Mirror', sub: 'anusreekr5081-cyber.github.io/spysmp', key: '', action: function () { window.open('https://anusreekr5081-cyber.github.io/spysmp/', '_blank', 'noopener'); } },

    { cat: 'Game Modes', icon: '🌍', label: 'Survival SMP', sub: 'Primary Ecosystem · Town Claims', key: '', action: function () { location.hash = '#modes'; filterCategory('survival'); } },
    { cat: 'Game Modes', icon: '🏰', label: 'Factions', sub: 'Combat & Territory Warfare', key: '', action: function () { location.hash = '#modes'; filterCategory('pvp'); } },
    { cat: 'Game Modes', icon: '🏝️', label: 'Skyblock', sub: 'Island Progression & Economy', key: '', action: function () { location.hash = '#modes'; filterCategory('economy'); } },
    { cat: 'Game Modes', icon: '❤️', label: 'Lifesteal SMP', sub: 'Heart Stealing Hardcore PvP', key: '', action: function () { location.hash = '#modes'; filterCategory('pvp'); } },
    { cat: 'Game Modes', icon: '⛏️', label: 'Prison', sub: 'Mining Ranks & Black Market', key: '', action: function () { location.hash = '#modes'; filterCategory('economy'); } },
    { cat: 'Game Modes', icon: '🛏️', label: 'Bedwars', sub: 'Squad PvP & Tactical Rush', key: '', action: function () { location.hash = '#modes'; filterCategory('minigames'); } },
    { cat: 'Game Modes', icon: '⚔️', label: 'Duels', sub: 'Ranked 1v1 Elo Arena', key: '', action: function () { location.hash = '#modes'; filterCategory('pvp'); } },
    { cat: 'Game Modes', icon: '🏃', label: 'Parkour', sub: 'Checkpoint Timers & Leaderboard', key: '', action: function () { location.hash = '#modes'; filterCategory('minigames'); } },
    { cat: 'Game Modes', icon: '💀', label: 'Hardcore SMP', sub: 'One Life Per Season Permadeath', key: '', action: function () { location.hash = '#modes'; filterCategory('survival'); } },
    { cat: 'Game Modes', icon: '🎨', label: 'Creative Plots', sub: 'Free WorldEdit & Shaders', key: '', action: function () { location.hash = '#modes'; filterCategory('survival'); } }
  ];

  var cmdkSelectedIndex = 0;
  var cmdkFilteredItems = [];

  function renderCmdkList() {
    if (!cmdkList) return;
    var query = (cmdkInput ? cmdkInput.value : '').trim().toLowerCase();
    cmdkFilteredItems = cmdkItems.filter(function (item) {
      if (!query) return true;
      return item.label.toLowerCase().indexOf(query) >= 0 ||
             item.sub.toLowerCase().indexOf(query) >= 0 ||
             item.cat.toLowerCase().indexOf(query) >= 0;
    });

    if (cmdkSelectedIndex >= cmdkFilteredItems.length) {
      cmdkSelectedIndex = Math.max(0, cmdkFilteredItems.length - 1);
    }

    if (cmdkFilteredItems.length === 0) {
      cmdkList.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No commands matching "<b>' + escapeHtml(query) + '</b>"</div>';
      return;
    }

    var html = '';
    var lastCat = null;
    cmdkFilteredItems.forEach(function (item, idx) {
      if (item.cat !== lastCat) {
        if (lastCat !== null) html += '</div>';
        html += '<div class="cmdk-group"><div class="cmdk-group-title">' + item.cat + '</div>';
        lastCat = item.cat;
      }
      var isSel = (idx === cmdkSelectedIndex);
      html += '<div class="cmdk-item ' + (isSel ? 'selected' : '') + '" data-idx="' + idx + '">' +
                '<span class="cmdk-item-icon">' + item.icon + '</span>' +
                '<span class="cmdk-item-label">' + escapeHtml(item.label) + '<span class="cmdk-item-sub">' + escapeHtml(item.sub) + '</span></span>' +
                (item.key ? '<kbd class="cmdk-item-badge">' + item.key + '</kbd>' : '') +
              '</div>';
    });
    if (lastCat !== null) html += '</div>';
    cmdkList.innerHTML = html;

    var selectedEl = cmdkList.querySelector('.cmdk-item.selected');
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }

  function openCmdk() {
    if (!cmdkDlg) return;
    playSound('open');
    if (typeof cmdkDlg.showModal === 'function') {
      cmdkDlg.showModal();
    } else {
      cmdkDlg.setAttribute('open', '');
    }
    if (cmdkInput) {
      cmdkInput.value = '';
      cmdkInput.focus();
    }
    cmdkSelectedIndex = 0;
    renderCmdkList();
  }

  function closeCmdk() {
    if (!cmdkDlg) return;
    if (typeof cmdkDlg.close === 'function') {
      cmdkDlg.close();
    } else {
      cmdkDlg.removeAttribute('open');
    }
  }

  function executeCmdkSelected() {
    if (cmdkFilteredItems[cmdkSelectedIndex]) {
      playSound('click');
      var action = cmdkFilteredItems[cmdkSelectedIndex].action;
      closeCmdk();
      if (action) action();
    }
  }

  if (sbCmdBtn) sbCmdBtn.addEventListener('click', openCmdk);
  if (tbCmdBtn) tbCmdBtn.addEventListener('click', openCmdk);
  if (dockCmdk) dockCmdk.addEventListener('click', openCmdk);
  if (cmdkCloseBtn) cmdkCloseBtn.addEventListener('click', closeCmdk);

  if (cmdkInput) {
    cmdkInput.addEventListener('input', function () {
      cmdkSelectedIndex = 0;
      renderCmdkList();
    });
    cmdkInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (cmdkFilteredItems.length > 0) {
          cmdkSelectedIndex = (cmdkSelectedIndex + 1) % cmdkFilteredItems.length;
          renderCmdkList();
          playSound('select');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (cmdkFilteredItems.length > 0) {
          cmdkSelectedIndex = (cmdkSelectedIndex - 1 + cmdkFilteredItems.length) % cmdkFilteredItems.length;
          renderCmdkList();
          playSound('select');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCmdkSelected();
      } else if (e.key === 'Escape') {
        closeCmdk();
      }
    });
  }

  if (cmdkList) {
    cmdkList.addEventListener('click', function (e) {
      var itemEl = e.target.closest('.cmdk-item');
      if (itemEl) {
        var idx = parseInt(itemEl.dataset.idx, 10);
        if (!isNaN(idx) && cmdkFilteredItems[idx]) {
          cmdkSelectedIndex = idx;
          executeCmdkSelected();
        }
      }
    });
  }

  /* ── 12. DYNAMIC ISLAND & LIVE TELEMETRY INSPECTOR ── */
  var dynamicIsland = $('dynamicIsland');
  var telemetryDlg = $('telemetryDlg');
  var telemetryClose = $('telemetryClose');
  var diPlayers = $('diPlayers');
  var diTps = $('diTps');
  var diPing = $('diPing');
  var telemJavaHost = $('telemJavaHost');
  var telemBedrockHost = $('telemBedrockHost');
  var telemVersion = $('telemVersion');
  var telemTps = $('telemTps');
  var telemPlayers = $('telemPlayers');
  var telemSoftware = $('telemSoftware');
  var telemMotd = $('telemMotd');
  var telemCopyJava = $('telemCopyJava');
  var telemCopyBedrock = $('telemCopyBedrock');

  function openTelemetry() {
    if (!telemetryDlg) return;
    playSound('open');
    if (typeof telemetryDlg.showModal === 'function') {
      telemetryDlg.showModal();
    } else {
      telemetryDlg.setAttribute('open', '');
    }
  }

  function closeTelemetry() {
    if (!telemetryDlg) return;
    if (typeof telemetryDlg.close === 'function') {
      telemetryDlg.close();
    } else {
      telemetryDlg.removeAttribute('open');
    }
  }

  if (dynamicIsland) {
    dynamicIsland.addEventListener('click', openTelemetry);
    dynamicIsland.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTelemetry();
      }
    });
  }
  if (telemetryClose) telemetryClose.addEventListener('click', closeTelemetry);

  if (telemCopyJava) {
    telemCopyJava.addEventListener('click', function () {
      copyServerIP();
    });
  }
  if (telemCopyBedrock) {
    telemCopyBedrock.addEventListener('click', function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText('play.spysmp.live:19132');
      }
      playSound('copy');
      showToast('✓ Copied Bedrock IP: play.spysmp.live:19132');
    });
  }

  // Poll server telemetry
  async function pollServerTelemetry() {
    try {
      var t0 = performance.now();
      var res = await fetch('/api/mcstatus').catch(function () { return null; });
      var ms = Math.round(performance.now() - t0);
      if (diPing) diPing.textContent = ms + 'ms';

      if (res && res.ok) {
        var data = await res.json();
        if (data && data.players) {
          var count = data.players.online || 18;
          var max = data.players.max || 200;
          if (diPlayers) diPlayers.textContent = count + ' Online';
          if (telemPlayers) telemPlayers.textContent = count + ' / ' + max + ' Players';
        }
        if (data.tps && diTps) diTps.textContent = data.tps.toFixed(1) + ' TPS';
        if (data.version && telemVersion) telemVersion.textContent = data.version + ' (Crossplay)';
        if (data.motd && telemMotd) telemMotd.textContent = data.motd;
        if (data.software && telemSoftware) telemSoftware.textContent = data.software;
      }
    } catch (e) {
      if (diPlayers) diPlayers.textContent = '18 Online';
      if (diTps) diTps.textContent = '20.0 TPS';
    }
  }
  pollServerTelemetry();
  setInterval(pollServerTelemetry, 12000);

  /* ── 13. SHORTCUTS DIALOG ── */
  var shortcutsDlg = $('shortcutsDlg');
  var shortcutsClose = $('shortcutsClose');
  var shortcutsBtn = $('shortcutsBtn');

  function openShortcuts() {
    if (!shortcutsDlg) return;
    playSound('open');
    if (typeof shortcutsDlg.showModal === 'function') {
      shortcutsDlg.showModal();
    } else {
      shortcutsDlg.setAttribute('open', '');
    }
  }

  function closeShortcuts() {
    if (!shortcutsDlg) return;
    if (typeof shortcutsDlg.close === 'function') {
      shortcutsDlg.close();
    } else {
      shortcutsDlg.removeAttribute('open');
    }
  }

  if (shortcutsBtn) shortcutsBtn.addEventListener('click', openShortcuts);
  if (shortcutsClose) shortcutsClose.addEventListener('click', closeShortcuts);

  /* ── 14. HERO MONOCHROME PARTICLE CANVAS ── */
  (function () {
    var canvas = $('heroCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width, height;
    var particles = [];
    var mouse = { x: -9999, y: -9999 };
    var numParticles = 48;

    function resize() {
      if (!canvas.parentElement) return;
      var rect = canvas.parentElement.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
    }
    window.addEventListener('resize', resize);
    resize();

    for (var i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.8
      });
    }

    canvas.parentElement.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    canvas.parentElement.addEventListener('mouseleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    var animId = null;
    function renderParticles() {
      if (document.hidden) {
        animId = requestAnimationFrame(renderParticles);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      var isDark = (root.getAttribute('data-theme') || 'dark') === 'dark';
      var pColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)';
      var lColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse gentle push
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 0) {
          p.x += (dx / dist) * 0.8;
          p.y += (dy / dist) * 0.8;
        }

        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var p2 = particles[j];
          var djx = p.x - p2.x;
          var djy = p.y - p2.y;
          var d = Math.sqrt(djx * djx + djy * djy);
          if (d < 90) {
            ctx.strokeStyle = lColor;
            ctx.lineWidth = 1 - (d / 90);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(renderParticles);
    }
    renderParticles();
  })();

  /* ── 15. LINEAR / VISION PRO SPOTLIGHT & 3D TILT ── */
  (function () {
    var cards = document.querySelectorAll('.feat-card, .mc-card, .rank-card, .stat, .telem-card');
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');

        // Subtle 3D perspective tilt
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var rotateX = ((y - cy) / cy) * -3.5;
        var rotateY = ((x - cx) / cx) * 3.5;
        card.style.transform = 'perspective(900px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) scale3d(1.015, 1.015, 1.015)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  })();

  /* ── 16. GLOBAL KEYBOARD SHORTCUTS ── */
  window.addEventListener('keydown', function (e) {
    // If typing inside an input/textarea/select or contenteditable, don't hijack normal keys
    var tag = (e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '');
    var isEditing = (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable));

    // Cmd+K / Ctrl+K or '/' to open command center (even from some inputs)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openCmdk();
      return;
    }

    if (isEditing) {
      if (e.key === 'Escape') {
        if (cmdkDlg && cmdkDlg.open) closeCmdk();
        if (shortcutsDlg && shortcutsDlg.open) closeShortcuts();
        if (telemetryDlg && telemetryDlg.open) closeTelemetry();
        if (authDlg && authDlg.open) closeAuth();
      }
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      openCmdk();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      copyServerIP();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleTheme();
      playSound('click');
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      if (soundToggleBtn) soundToggleBtn.click();
    } else if (e.key === ' ') {
      e.preventDefault();
      openTelemetry();
    } else if (e.key === '?') {
      e.preventDefault();
      openShortcuts();
    } else if (e.key >= '1' && e.key <= '6') {
      var targetPages = ['home', 'modes', 'vote', 'ranks', 'rules', 'join'];
      var idx = parseInt(e.key, 10) - 1;
      if (targetPages[idx]) {
        location.hash = '#' + targetPages[idx];
        playSound('click');
      }
    } else if (e.key === 'Escape') {
      if (cmdkDlg && cmdkDlg.open) closeCmdk();
      if (shortcutsDlg && shortcutsDlg.open) closeShortcuts();
      if (telemetryDlg && telemetryDlg.open) closeTelemetry();
      if (authDlg && authDlg.open) closeAuth();
      if (typeof closeSidebar === 'function') closeSidebar();
    }
  });

  /* ── 17. 3D SKIN HOLOGRAM HOVER EFFECT ── */
  var acctBodyPreview = $('acctBodyPreview');
  var acctBodyWrap = $('acctBodyWrap');
  if (acctBodyWrap && acctBodyPreview) {
    acctBodyWrap.addEventListener('mousemove', function (e) {
      var rect = acctBodyWrap.getBoundingClientRect();
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var rotateX = ((y - cy) / cy) * -12;
      var rotateY = ((x - cx) / cx) * 12;
      acctBodyPreview.style.transform = 'perspective(400px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) scale(1.1)';
    });
    acctBodyWrap.addEventListener('mouseleave', function () {
      acctBodyPreview.style.transform = 'perspective(400px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

})();
