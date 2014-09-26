$CA.themes(<%= JSON.stringify(appThemes, function(_, val) {
    return (typeof val === 'string' && val.substr(-4) === '.css') ? static + '/' + val : val;
}) %>);