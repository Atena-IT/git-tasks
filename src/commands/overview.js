import { Command } from 'commander';
import getBackend from '../backends/index.js';
import { formatOverview, printError } from '../utils/format.js';
import { parseIssueTitle } from '../utils/format.js';

export function makeOverviewCommand() {
  return new Command('overview')
    .description('Show hierarchical overview of epics, sprints, and stories')
    .option('--depth <n>', 'Depth: 1=epics, 2=+sprints, 3=+stories', '1')
    .option('--state <state>', 'Issue state: open, closed, all', 'open')
    .action(async (opts) => {
      try {
        const backend = getBackend();
        const depth = parseInt(opts.depth, 10) || 1;

        const [epics, sprints, stories] = await Promise.all([
          backend.listIssues({ labels: ['epic'], state: opts.state }),
          depth >= 2 ? backend.listIssues({ labels: ['sprint'], state: opts.state }) : Promise.resolve([]),
          depth >= 3 ? backend.listIssues({ labels: ['user-story'], state: opts.state }) : Promise.resolve([]),
        ]);

        // Build hierarchy
        const epicMap = new Map();
        for (const e of epics) {
          epicMap.set(e.number, { ...e, sprints: [] });
        }

        if (depth >= 2) {
          const sprintMap = new Map();
          for (const s of sprints) {
            const parsed = parseIssueTitle(s.title);
            // ref is like '#5' or '5'
            const epicNum = parsed.ref ? parseInt(parsed.ref.replace('#', ''), 10) : null;
            const sprintObj = { ...s, stories: [], epicNum };
            sprintMap.set(s.number, sprintObj);
            if (epicNum && epicMap.has(epicNum)) {
              epicMap.get(epicNum).sprints.push(sprintObj);
            } else {
              // Orphan sprint — attach to a virtual "unlinked" epic
              let unlinked = epicMap.get(0);
              if (!unlinked) {
                unlinked = { number: 0, title: 'epic: (unlinked)', state: 'OPEN', sprints: [] };
                epicMap.set(0, unlinked);
              }
              unlinked.sprints.push(sprintObj);
            }
          }

          if (depth >= 3) {
            for (const story of stories) {
              const parsed = parseIssueTitle(story.title);
              const sprintNum = parsed.ref ? parseInt(parsed.ref.replace('#', ''), 10) : null;
              if (sprintNum && sprintMap.has(sprintNum)) {
                sprintMap.get(sprintNum).stories.push(story);
              }
            }
          }
        }

        const epicList = [...epicMap.values()].filter(e => e.number !== 0);
        // Put unlinked last if present
        if (epicMap.has(0)) epicList.push(epicMap.get(0));

        console.log(formatOverview(epicList, { depth }));
      } catch (err) {
        printError(err.message);
      }
    });
}
