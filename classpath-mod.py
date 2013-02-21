# coding: utf-8
from lxml import etree
import re
from lxml.builder import E
import os
import sys
import fnmatch
parser = etree.XMLParser(remove_blank_text=True)


def replacePrefs(tree):
    prefs_list = ['agent', 'kf']
    for pref in prefs_list:
        replaceMatching(tree, pref)


def replaceMatching(tree, pref):
    wholepref = '/' + pref + '-'
    items = tree.xpath(
        "//classpathentry[contains(@path, '" + pref + "') != true]")
    for item in items:
        path = item.get("path")
        m = re.search('(.*)' + wholepref + '(.+?)/(.*)', path)
        if m is not None:
            suf = m.group(2)
            result = E.classpathentry(
                combineaccessrules="false", kind="src", path=wholepref + suf)
            print etree.tostring(result)
            tree.getroot().replace(item, result)


def update_classpath(file_name):
    tree = etree.parse(file_name, parser)
    print "Processing file: %s" % file_name
    replacePrefs(tree)
    with open(file_name, "w") as f:
        f.write(etree.tostring(tree, pretty_print=True))


def get_classpaths(root_path):
    matches = []
    for root, dirnames, filenames in os.walk(root_path):

        def clear_dirs(dirname):
            if dirname in dirnames:
                dirnames.remove(dirname)

        clear = False
        for filename in fnmatch.filter(filenames, '*.classpath'):
            clear = True
            matches.append(os.path.join(root, filename))
        # optimization - we do not have nested modules
        if clear:
            dirnames[:] = []
        else:
            clear_dirs('target')
            clear_dirs('.git')
            clear_dirs('.settings')
            clear_dirs('src')
            clear_dirs('env-install')
    return matches


def main():
    if len(sys.argv) == 1:
        print "You should pass the path to your KITS-App_ATG-Dev folder as command-line argument"
        return
    for cp in get_classpaths(sys.argv[1]):
        update_classpath(cp)


if __name__ == "__main__":
    main()
