let scriptTag = document.getElementById("gameScript");
let queryData = [...scriptTag.src.matchAll(/[\?&]([^=&]+)(?:=([^&=]+)|)/g)];
export const queryVars = {};
for (let q of queryData) {
    queryVars[q[1]] = q[2];
}