module.exports = {
  getNumbers: (name) => {
    let firstBracket = name.lastIndexOf('[')
    let subbed = name.substr(firstBracket)
    let replaced = subbed.replace('[', '').replace(']', '')
    let split = replaced.split(',')
    return [parseInt(split[0]), parseInt(split[1])]
  },
  replaceNumbers: (name, num1, num2) => {
    let firstBracket = name.lastIndexOf('[')
    let subbed = name.substr(firstBracket)
    let replaced = subbed.replace('[', '').replace(']', '')
    let split = replaced.split(',')
    split[0] = num1.toString() || split[0]
    split[1] = num2.toString() || split[1]
    let n = name.substr(0, firstBracket-1)
    n = `${n} [${split[0]},${split[1]}]`
    return n
  }
}