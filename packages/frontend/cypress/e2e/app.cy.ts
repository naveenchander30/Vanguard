describe('Spectrum Audit App', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/infrastructure', { body: [] }).as('getInfrastructure');
    cy.intercept('GET', '/api/scores', { body: [] }).as('getScores');
    cy.intercept('GET', '/api/telemetry', { body: [] }).as('getTelemetry');
    cy.intercept('GET', '/api/clients', { body: [] }).as('getClients');
  });

  it('navigates between pages via sidebar', () => {
    cy.visit('/');
    cy.contains('Dashboard').should('exist');

    cy.contains('Infrastructure').click();
    cy.url().should('include', '/infrastructure');
    cy.contains('Add AP').should('exist');

    cy.contains('Telemetry').click();
    cy.url().should('include', '/telemetry');
    cy.contains('Export CSV').should('exist');

    cy.contains('Clients').click();
    cy.url().should('include', '/clients');
    cy.contains('Access Points').should('exist');
  });

  it('loads and displays dashboard scores', () => {
    const mockScores = [
      { id: 1, channel: 1, band: '2.4GHz', score: 25, breakdown: '{}', createdAt: new Date().toISOString() },
      { id: 2, channel: 36, band: '5GHz', score: 60, breakdown: '{}', createdAt: new Date().toISOString() },
    ];
    cy.intercept('GET', '/api/scores', { body: mockScores }).as('getScores');
    cy.visit('/');
    cy.wait('@getScores');
    cy.contains('Channels Monitored').should('exist');
    cy.contains('2').should('exist');
    cy.contains('25').should('exist');
    cy.contains('60').should('exist');
  });

  it('shows empty state on infrastructure page', () => {
    cy.visit('/infrastructure');
    cy.wait('@getInfrastructure');
    cy.contains('Add AP').should('exist');
  });

  it('creates a new infrastructure entry', () => {
    cy.intercept('POST', '/api/infrastructure', {
      statusCode: 201,
      body: { id: 1, bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Office', label: '', band: '5GHz', notes: '', createdAt: '', updatedAt: '' },
    }).as('createInfrastructure');
    cy.intercept('GET', '/api/infrastructure', {
      body: [{ id: 1, bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Office', label: '', band: '5GHz', notes: '', createdAt: '', updatedAt: '' }],
    }).as('getAfterCreate');

    cy.visit('/infrastructure');
    cy.get('input[placeholder*="BSSID"]').type('AA:BB:CC:DD:EE:FF');
    cy.get('input[placeholder="SSID"]').type('Office');
    cy.get('input[placeholder*="Band"]').type('5GHz');
    cy.contains('Add').click();
    cy.wait('@createInfrastructure');
    cy.contains('AA:BB:CC:DD:EE:FF').should('exist');
  });

  it('deletes an infrastructure entry', () => {
    cy.intercept('GET', '/api/infrastructure', {
      body: [{ id: 1, bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Office', label: '', band: '5GHz', notes: '', createdAt: '', updatedAt: '' }],
    }).as('getInfrastructure');
    cy.intercept('DELETE', '/api/infrastructure/1', { statusCode: 204 }).as('deleteInfrastructure');

    cy.visit('/infrastructure');
    cy.wait('@getInfrastructure');
    cy.contains('Delete').click();
    cy.wait('@deleteInfrastructure');
  });

  it('renders clients page with AP cards', () => {
    const mockClients = [
      { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'AP-One', activeClientCount: 5, source: 'kismet', lastSeen: new Date().toISOString() },
      { bssid: 'AA:BB:CC:DD:EE:02', ssid: 'AP-Two', activeClientCount: 12, source: 'snmp', lastSeen: new Date().toISOString() },
    ];
    cy.intercept('GET', '/api/clients', { body: mockClients }).as('getClients');
    cy.visit('/clients');
    cy.wait('@getClients');
    cy.contains('AP-One').should('exist');
    cy.contains('AP-Two').should('exist');
    cy.contains('5 clients').should('exist');
    cy.contains('12 clients').should('exist');
  });

  it('shows empty state on telemetry page', () => {
    cy.visit('/telemetry');
    cy.wait('@getTelemetry');
    cy.contains('Export CSV').should('exist');
  });
});
