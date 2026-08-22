(() => {
  const key = (eventId) => `talenta_workspace_revision:${eventId}`;
  const conflict =
    "Data Event telah diperbarui pengguna lain. Muat ulang sebelum menyimpan.";
  const read = (data) =>
    Number(data?.workspaceRevision ?? data?.data?.workspaceRevision) || null;
  const current = (eventId) =>
    Number(sessionStorage.getItem(key(eventId))) || null;
  const remember = (eventId, data) => {
    const revision = read(data);
    if (revision) sessionStorage.setItem(key(eventId), String(revision));
    return revision;
  };
  const body = (value, revision) => ({ ...value, expectedRevision: revision });
  const query = (url, revision) => {
    const next = new URL(url, location.origin);
    next.searchParams.set("expectedRevision", String(revision));
    return `${next.pathname}${next.search}`;
  };
  const next = (eventId, response) => remember(eventId, response);
  const isConflict = (error) => error?.status === 409;
  window.TalentaWorkspaceRevision = Object.freeze({
    body,
    conflict,
    current,
    isConflict,
    next,
    query,
    read,
    remember,
  });
})();
