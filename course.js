(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch];
    });
  }

  var level = Number(document.body.getAttribute('data-course-level'));
  var catalog = window.JULI_COURSE_STRUCTURE || {};
  var course = catalog[level];
  var app = el('app');
  var notice = el('notice');
  var modules = el('modules');
  var locked = el('locked');
  var lockedTitle = el('lockedTitle');
  var lockedText = el('lockedText');
  var courseTitle = el('courseTitle');
  var courseSubtitle = el('courseSubtitle');
  var courseLevel = el('courseLevel');
  var out = el('out');
  var db = null;
  var profile = null;
  var completed = {};

  function showError(title, text) {
    if (app) app.classList.add('hidden');
    if (lockedTitle) lockedTitle.textContent = title;
    if (lockedText) lockedText.textContent = text;
    if (locked) locked.classList.remove('hidden');
  }

  function contiguousDone() {
    var n = 0;
    while (course && course.modules && n < course.modules.length && completed[n + 1] === true) n++;
    return n;
  }

  function blockKind(text) {
    var t = String(text || '').trim().toLowerCase();
    if (t.indexOf('практика') === 0 || t.indexOf('задание') === 0) return ['Практика', 'practice'];
    if (t.indexOf('важно') === 0 || t.indexOf('обратите внимание') === 0) return ['Важно', 'important'];
    if (t.indexOf('цель') === 0) return ['Что вы изучите', ''];
    if (t.indexOf('алгоритм') === 0 || t.indexOf('последовательность') === 0) return ['Алгоритм работы', ''];
    if (t.indexOf('основн') === 0 || t.indexOf('ключев') === 0) return ['Ключевые моменты', ''];
    return ['Теория', ''];
  }

  function lessonHtml(content) {
    return String(content || '').split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (part) {
      var kind = blockKind(part);
      return '<div class="lesson-block ' + kind[1] + '"><strong>' + kind[0] + '</strong><p>' + esc(part) + '</p></div>';
    }).join('');
  }

  function renderProgress() {
    if (!course || !profile || profile.role === 'owner') return;
    var box = el('courseProgress');
    if (!box) {
      box = document.createElement('section');
      box.id = 'courseProgress';
      box.className = 'course-progress';
      notice.insertAdjacentElement('afterend', box);
    }
    var total = course.modules.length;
    var done = contiguousDone();
    var percent = Math.round(done / total * 100);
    var current = done < total ? done + 1 : total;
    var steps = '';
    for (var i = 1; i <= total; i++) {
      var cls = i <= done ? 'done' : (i === current && done < total ? 'current' : '');
      steps += '<span class="' + cls + '">' + (i <= done ? '✓' : i) + '</span>';
    }
    box.innerHTML = '<div class="course-progress-top"><div><span class="course-progress-kicker">Ваш прогресс</span><strong>' +
      (done === total ? 'Ступень завершена' : 'Открыт модуль ' + current + ' из ' + total) +
      '</strong></div><div class="course-progress-value">' + percent + '%</div></div>' +
      '<div class="course-progress-track"><div class="course-progress-fill" style="width:' + percent + '%"></div></div>' +
      '<div class="course-progress-steps">' + steps + '</div>' +
      '<div class="course-progress-note">' +
      (done === total ? 'Все модули подтверждены преподавателем.' : 'Следующий модуль откроется после подтверждения преподавателем текущего.') +
      '</div>';
  }

  function renderModules(materialRows) {
    var grouped = {};
    (materialRows || []).forEach(function (row) {
      var n = Number(row.module_no);
      if (!grouped[n]) grouped[n] = [];
      grouped[n].push(row);
    });

    var owner = profile && profile.role === 'owner';
    var doneCount = contiguousDone();
    var unlockedThrough = owner ? course.modules.length : Math.min(doneCount + 1, course.modules.length);
    var html = '';

    course.modules.forEach(function (def, idx) {
      var n = idx + 1;
      var rows = grouped[n] || [];
      var title = rows.length && rows[0].title ? rows[0].title : def.title;
      var isUnlocked = owner || n <= unlockedThrough;
      var isDone = !owner && n <= doneCount;

      if (!isUnlocked) {
        html += '<article class="module module-locked" id="module-' + n + '">' +
          '<div class="module-lock-icon">🔒</div><div><div class="eyebrow">Модуль ' + n + '</div>' +
          '<h2>' + esc(title) + '</h2><div class="module-locked-text">Откроется после подтверждения предыдущего модуля преподавателем.</div></div></article>';
        return;
      }

      var content = rows.map(function (r) { return r.content || ''; }).filter(Boolean).join('\n\n');
      html += '<article class="module ' + (isDone ? 'completed ' : '') + (!owner && n === unlockedThrough && doneCount < course.modules.length ? 'current' : '') + '" id="module-' + n + '">' +
        '<div class="eyebrow">Модуль ' + n + (isDone ? ' · ПРОЙДЕН' : '') + '</div>' +
        '<h2>' + esc(title) + '</h2>' +
        (content ? '<div class="lesson">' + lessonHtml(content) + '</div>' : '<div class="module-empty">Материал модуля пока не опубликован преподавателем.</div>') +
        '<div class="module-footer"><span class="module-state">' +
        (owner ? 'Режим преподавателя' : (isDone ? '✓ Подтверждено преподавателем' : 'Текущий модуль · ожидает подтверждения')) +
        '</span></div></article>';
    });

    modules.innerHTML = html;
  }

  async function init() {
    try {
      if (!course || !app || !modules || !notice) {
        showError('Не удалось открыть курс', 'Страница курса загружена некорректно.');
        return;
      }

      document.title = course.title + ' — JULI';
      courseTitle.textContent = course.title;
      courseSubtitle.textContent = course.subtitle || '';
      courseLevel.textContent = 'Ступень ' + level;

      if (!window.supabase || !window.JULI_SUPABASE_URL || !window.JULI_SUPABASE_ANON_KEY) {
        showError('Авторизация недоступна', 'Не удалось подключиться к системе обучения.');
        return;
      }

      db = window.supabase.createClient(window.JULI_SUPABASE_URL, window.JULI_SUPABASE_ANON_KEY);
      var userResult = await db.auth.getUser();
      var user = userResult && userResult.data ? userResult.data.user : null;
      if (!user) {
        location.href = 'login.html';
        return;
      }

      var profileResult = await db.from('profiles').select('*').eq('id', user.id).single();
      if (profileResult.error || !profileResult.data) {
        showError('Профиль не найден', 'Войдите повторно или обратитесь к преподавателю.');
        return;
      }
      profile = profileResult.data;

      if (profile.role !== 'owner' && ((Object.prototype.hasOwnProperty.call(profile, 'is_active') && !profile.is_active) || (Object.prototype.hasOwnProperty.call(profile, 'archived') && profile.archived))) {
        await db.auth.signOut();
        location.href = 'login.html?blocked=1';
        return;
      }

      var allowed = profile.role === 'owner';
      if (!allowed) {
        var accessResult = await db.from('course_access').select('access_granted').eq('student_id', user.id).eq('course_level', level).maybeSingle();
        if (accessResult.error) {
          showError('Не удалось проверить доступ', 'Обновите страницу или обратитесь к преподавателю.');
          return;
        }
        allowed = !!(accessResult.data && accessResult.data.access_granted);
      }
      if (!allowed) {
        showError('Доступ к ступени закрыт', 'Преподаватель ещё не открыл этот курс.');
        return;
      }

      if (profile.role !== 'owner') {
        var progressResult = await db.from('student_progress').select('module_no,completed').eq('student_id', user.id).eq('course_level', level);
        if (progressResult.error) {
          console.error(progressResult.error);
          showError('Не удалось загрузить прогресс', 'Преподавателю нужно повторно выполнить актуальный supabase-schema.sql.');
          return;
        }
        (progressResult.data || []).forEach(function (row) {
          if (row.completed) completed[Number(row.module_no)] = true;
        });
      }

      var materialResult = await db.from('course_materials').select('module_no,title,content,sort_order').eq('course_level', level).eq('published', true).order('sort_order', { ascending: true }).order('module_no', { ascending: true });
      if (materialResult.error) {
        console.error(materialResult.error);
        showError('Материалы временно недоступны', 'Проверьте актуальную схему Supabase.');
        return;
      }

      locked.classList.add('hidden');
      app.classList.remove('hidden');
      notice.textContent = profile.role === 'owner' ? 'Режим преподавателя: опубликованная версия курса.' : 'Следующий модуль открывает преподаватель после подтверждения текущего.';
      renderProgress();
      renderModules(materialResult.data || []);
    } catch (err) {
      console.error(err);
      showError('Не удалось открыть курс', 'Ошибка загрузки курса. Обновите страницу или обратитесь к преподавателю.');
    }
  }

  if (out) {
    out.addEventListener('click', async function () {
      try { if (db) await db.auth.signOut(); } catch (e) {}
      location.href = './';
    });
  }

  init();
})();
