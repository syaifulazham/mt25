const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/organizer/certificates/_components/TemplateEditorFixed.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add the Non Contest Participant radio button in first form (collapsible section)
const eventWinnersPattern = /<span className="ml-2">Event Winners<\/span>\s*<\/label>\s*<\/div>\s*<\/div>/;
const nonContestParticipantRadio = `<span className="ml-2">Event Winners</span>
                      </label>
                    </div>
                    <div>
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="targetType"
                          value="NON_CONTEST_PARTICIPANT" 
                          checked={targetType === 'NON_CONTEST_PARTICIPANT'}
                          onChange={() => setTargetType('NON_CONTEST_PARTICIPANT')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Non Contest Participant</span>
                      </label>
                    </div>
                  </div>`;

content = content.replace(eventWinnersPattern, nonContestParticipantRadio);

// 2. Add the Non Contest Participant radio button in second form (non-collapsible section)
const secondEventWinnersPattern = /Event Winners<\/span>\s*<\/label>\s*<\/div>\s*<\/div>/g;
const matches = content.match(secondEventWinnersPattern);
if (matches && matches.length > 1) {
  // Find the second occurrence
  let position = content.indexOf(matches[0]) + matches[0].length;
  position = content.indexOf(matches[0], position);
  
  if (position !== -1) {
    const nonContestParticipantRadio2 = `Event Winners</span>
                      </label>
                    </div>
                    <div>
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="targetType"
                          value="NON_CONTEST_PARTICIPANT" 
                          checked={targetType === 'NON_CONTEST_PARTICIPANT'}
                          onChange={() => setTargetType('NON_CONTEST_PARTICIPANT')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Non Contest Participant</span>
                      </label>
                    </div>
                  </div>`;
                  
    content = content.substring(0, position) + nonContestParticipantRadio2 + content.substring(position + matches[0].length);
  }
}

// 3. Add the display text for NON_CONTEST_PARTICIPANT in both places
const eventWinnerDisplayPattern = /{targetType === 'EVENT_WINNER' && \(!eventId \|\| !winnerRangeStart \|\| !winnerRangeEnd\) && \s*'Event winners \(please complete all fields\)'\}/g;
const nonContestParticipantDisplay = `{targetType === 'EVENT_WINNER' && (!eventId || !winnerRangeStart || !winnerRangeEnd) && 
                        'Event winners (please complete all fields)'}
                      {targetType === 'NON_CONTEST_PARTICIPANT' && 
                        'Non-competing participants (observers, guests, volunteers, etc.)'}`;

content = content.replace(eventWinnerDisplayPattern, nonContestParticipantDisplay);

fs.writeFileSync(filePath, content, 'utf8');
console.log('TemplateEditorFixed.tsx updated successfully');
