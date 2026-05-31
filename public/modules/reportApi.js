export function createReportApi({ fetchImpl = fetch } = {}) {
  return {
    listReports() {
      return requestJson(fetchImpl, '/api/reports');
    },
    loadReport(reportId) {
      return requestJson(fetchImpl, `/api/reports/${reportId}`);
    },
    saveRevision(reportId, payload) {
      return requestJson(fetchImpl, `/api/reports/${reportId}/revisions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    setCurrentRevision(reportId, revisionId) {
      return requestJson(fetchImpl, `/api/reports/${reportId}/current-revision`, {
        method: 'POST',
        body: JSON.stringify({ revisionId })
      });
    }
  };
}

export async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
