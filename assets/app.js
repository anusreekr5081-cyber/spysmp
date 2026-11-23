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

})();
