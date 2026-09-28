// Posts and comments one press of the admin's re-render reads, both tables together
// (#98, C24). About 1000 renders stay well inside the admin page's time limit, and a
// larger site continues on the next press.
export const RERENDER_BODIES_PER_PRESS = 1000;
